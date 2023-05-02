sap.ui.define([
	"./BaseController",
	"sap/ui/model/json/JSONModel",
	"sap/ui/core/routing/History",
	"../model/formatter",
	"../model/helper",
	"sap/m/MessageToast",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
], function (BaseController, JSONModel, History, formatter, helper, MessageToast, Filter, FilterOperator) {
	"use strict";

	return BaseController.extend("br.com.petrobras.pm.yspm_medidas_b.controller.Object", {

		formatter: formatter,

		/* =========================================================== */
		/* lifecycle methods                                           */
		/* =========================================================== */

		/**
		 * Called when the worklist controller is instantiated.
		 * @public
		 */
		onInit : function () {
			// Model used to manipulate control states. The chosen values make sure,
			// detail page is busy indication immediately so there is no break in
			// between the busy indication for loading the view's meta data
			var iOriginalBusyDelay,
				oViewModel = new JSONModel({
					busy : true,
					delay : 0
				});
			
			var mTextosLongos = new JSONModel({
				TextoLongoRti: "",
				TextoLongoAtividade: ""
			});
			this.setModel(mTextosLongos, "mTextosLongos");

			this.getRouter().getRoute("object").attachPatternMatched(this._onObjectMatched, this);

			// Store original busy indicator delay, so it can be restored later on
			iOriginalBusyDelay = this.getView().getBusyIndicatorDelay();
			this.setModel(oViewModel, "objectView");
			this.getOwnerComponent().getModel().metadataLoaded().then(function () {
					// Restore original busy indicator delay for the object view
					oViewModel.setProperty("/delay", iOriginalBusyDelay);
				}
			);
		},

		/* =========================================================== */
		/* event handlers                                              */
		/* =========================================================== */


		/**
		 * Event handler  for navigating back.
		 * It there is a history entry we go one step back in the browser history
		 * If not, it will replace the current entry of the browser history with the worklist route.
		 * @public
		 */
		onNavBack : function() {
			var sPreviousHash = History.getInstance().getPreviousHash();

			if (sPreviousHash !== undefined) {
				history.go(-1);
			} else {
				this.getRouter().navTo("worklist", this.getModel().refresh(true), true);
			}
		},
		
		totalMedidasSelecionadas: 0,
		totalMensagens: 0,
		listaMensagens: undefined,
		
		onAprovar: function(oEvent) {			
			var that     = this;
			var sPath    = oEvent.getSource().getBindingContext().sPath;
			var entidade = this.preencheEntidade(oEvent);
			var i18n     = this.getView().getModel('i18n');
			var modelo   = this.getView().getModel();
			this.getView().setBusy(true);
			
			this.totalMedidasSelecionadas = 0;
			this.totalMensagens           = 0;
			this.listaMensagens           = undefined;
			
			var mensagemSucesso  = {"message": i18n.getProperty("mensagemSucessoAprovacao"), "severity":"success"};
			var mensagemErro     = {"message": i18n.getProperty("mensagemErroAprovacao"), "severity":"error"};
			
			if (entidade !== undefined && entidade.parametros.length !== 0){
				this.totalMedidasSelecionadas = entidade.parametros.length;
				for (var i = 0; i < this.totalMedidasSelecionadas; i++) {
					var novaEntidade = entidade.parametros[i];
					modelo.update(sPath, novaEntidade, {
						success: function(oData, response){
							if (response.headers["sap-message"]){
								var mensagem = response.headers['sap-message'];
								try {
									mensagem = JSON.parse(mensagem);
									that.preencheMensagem(mensagem);
								} catch(e) {
									console.log('erro ao tentar aprovar medida: \n' + JSON.stringfy(e));
								}
							} else {
								that.preencheMensagem(mensagemErro);
							}
							
						},
						error: function(oError){
							if (oError && oError.response && oError.response.body) {
								that.preencheMensagem(mensagemErro);
							} else {
								that.preencheMensagem(mensagemErro);
							}
						}
					});
				};
			} else {
				this.getView().setBusy(false);
				MessageToast.show("Selecionar ao menos 1 item para aprovação.");
			};
			this.getView().setBusy(false);
		},
		
		preencheEntidade: function (oEvent) {
			var listagem = {};
			listagem.parametros = [];
			
			var contexto = oEvent.getSource().getBindingContext();
			var oItem    = contexto.getObject();
			
			var parametro = {};
			
			parametro.Nota           = oItem.Nota;
			parametro.NumMedida      = oItem.NumMedida;
			parametro.Centro         = oItem.Centro;
			parametro.LocInstalacao  = oItem.LocInstalacao;
			parametro.Qsmnum         = oItem.Qsmnum;
			parametro.QtdMonitoracao = oItem.QtdMonitoracao
			
			listagem.parametros.push(parametro);

			return listagem;			
		},
		
		preencheMensagem: function(mensagem) {
			this.totalMensagens ++;
			if (!this.listaMensagens) {
				this.listaMensagens = mensagem;
			} else {
				if (typeof this.listaMensagens.detail === 'undefined') {
					this.listaMensagens.details = [];
				}
				this.listaMensagens.details.push(mensagem);
			}
			
			if (this.totalMensagens >= this.totalMedidasSelecionadas) {
				this.getView().setBusy(false);
				Helper.exibeMensagem(this.listaMensagens);
			}
		},

		/* =========================================================== */
		/* internal methods                                            */
		/* =========================================================== */

		/**
		 * Binds the view to the object path.
		 * @function
		 * @param {sap.ui.base.Event} oEvent pattern match event in route 'object'
		 * @private
		 */
		_onObjectMatched : function (oEvent) {
			var sObjectId =  oEvent.getParameter("arguments");
			this.getModel().metadataLoaded().then( function() {
				var sObjectPath = this.getModel().createKey("Medidas", sObjectId);
				this._bindView("/" + sObjectPath);
				this._buscarTextos(sObjectId);
				
			}.bind(this));
		},
		
		_buscarTextos: function(sObjectId) {
			var that               = this;
			var oModelo            = this.getView().getModel();
			var sPathTextoLongoRti = this.getModel().createKey("TextosLongosRti", sObjectId);
			var sPathTextoLongoAtv = this.getModel().createKey("TextosLongosAtividade", sObjectId);
			
			var parametrosTextoRti = {
					success: function(oData,response){
						that.getModel("mTextosLongos").setProperty("/TextoLongoRti", oData.TextLongoRti);
					}.bind(this),
					error: function(response){
						console.log("erro:" + JSON.stringify(response));
					}.bind(this)
			}
			
			var parametrosTextoAtv = {
					success: function(oData,response){
						that.getModel("mTextosLongos").setProperty("/TextoLongoAtividade", oData.TextoLongoAtv);
					}.bind(this),
					error: function(response){
						console.log("erro:" + JSON.stringify(response));
					}.bind(this)
			}
			
			oModelo.read("/" + sPathTextoLongoRti, parametrosTextoRti);
			oModelo.read("/" + sPathTextoLongoAtv, parametrosTextoAtv);
		},

		/**
		 * Binds the view to the object path.
		 * @function
		 * @param {string} sObjectPath path to the object to be bound
		 * @private
		 */
		_bindView : function (sObjectPath) {
			var oViewModel = this.getModel("objectView"),
				oDataModel = this.getModel();

			this.getView().bindElement({
				path: sObjectPath,
				parameters : {expand: "TextosLongosAtividade,TextosLongosRti"},
				events: {
					change: this._onBindingChange.bind(this),
					dataRequested: function () {
						oDataModel.metadataLoaded().then(function () {
							// Busy indicator on view should only be set if metadata is loaded,
							// otherwise there may be two busy indications next to each other on the
							// screen. This happens because route matched handler already calls '_bindView'
							// while metadata is loaded.
							oViewModel.setProperty("/busy", true);
						});
					},
					dataReceived: function () {
						oViewModel.setProperty("/busy", false);
					}
				}
			});
		},

		_onBindingChange : function () {
			var oView = this.getView(),
				oViewModel = this.getModel("objectView"),
				oElementBinding = oView.getElementBinding();

			// No data for the binding
			if (!oElementBinding.getBoundContext()) {
				this.getRouter().getTargets().display("objectNotFound");
				return;
			}

			var oResourceBundle = this.getResourceBundle(),
				oObject = oView.getBindingContext().getObject(),
				sObjectId = oObject.Nota,
				sObjectName = oObject.Nota;

			oViewModel.setProperty("/busy", false);
			this.getView().byId("iconTabBar").setSelectedKey("kDetalheMedida");
			oViewModel.setProperty("/shareSendEmailSubject",
			oResourceBundle.getText("shareSendEmailObjectSubject", [sObjectId]));
			oViewModel.setProperty("/shareSendEmailMessage",
			oResourceBundle.getText("shareSendEmailObjectMessage", [sObjectName, sObjectId, location.href]));
		},
		
		/* =========================================================== */
		/* Anexos Solicitação                                          */
		/* =========================================================== */
		
		onAnexosSolic: function(oEvent) {
			if (!this._anexosSolicDialog) {
				this._anexosSolicDialog = sap.ui.xmlfragment("br.com.petrobras.pm.yspm_medidas_b.view.AnexosSolicitacao",this);
			}
			this.getView().addDependent(this._anexosSolicDialog);
			this._buscarAnexos(oEvent, 'SOL');
			this._anexosSolicDialog.open();
		},
		
		_carregaModeloAnexosSol: function(AnexosRti) {
			this.getView().setModel(new JSONModel(AnexosRti), "mAnexosSol");
		},
		
		onSelecionarAnexoSolic: function(oEvent) {
			var that       = this;
			var oModelo    = this.getView().getModel();
			var oItem      = oEvent.getSource().getBindingContext("mAnexosSol").getObject();
			var sService   = this.getView().getModel().sServiceUrl;
			var sPath      = "/" + this.getModel().createKey("Anexos", oItem);
			var sPathAnexo = sPath + "/$value"; 
			
			var parametrosDLAnexoSol ={
					success: function(oData, response){
						sap.m.URLHelper.redirect(oData.__metadata.media_src, true);
//						window.open(oData.__metadata.media_src, '_blank', true);
					},
					error: function(response) {
						console.log("erro:" + JSON.stringify(response));
					}
			};
			oModelo.read(sPath,parametrosDLAnexoSol);
			
			this._anexosSolicDialog.close();
		},
		
		/* =========================================================== */
		/* Anexos RTI                                                  */
		/* =========================================================== */
		
		onAnexosRti: function(oEvent) {
			if (!this._anexosRtiDialog) {
				this._anexosRtiDialog = sap.ui.xmlfragment("br.com.petrobras.pm.yspm_medidas_b.view.AnexosRti",this);
			}
			this.getView().addDependent(this._anexosRtiDialog);
			this._buscarAnexos(oEvent, 'RTI');
			this._anexosRtiDialog.open();
		},
		
		_carregaModeloAnexosRti: function(AnexosRti) {
			this.getView().setModel(new JSONModel(AnexosRti), "mAnexosRti");
		},
		
		onSelecionarAnexoRti: function(oEvent) {
			var that     = this;
			var oModelo  = this.getView().getModel();
			var oItem    = oEvent.getSource().getBindingContext('mAnexosRti').getObject();
			var sService = this.getView().getModel().sServiceUrl;
			var sPath    = "/" + this.getModel().createKey("Anexos", oItem);
			var sPathAnexo = sPath + "/$value";
			
			var parametrosDLAnexoRti = {
				success: function(oData,response){
					sap.m.URLHelper.redirect(oData.__metadata.media_src, true);
//					window.open(oData.__metadata.media_src, '_blank', true);
				},
				error: function(response){
					console.log("erro:" + JSON.stringify(response));
				}
			};
			
			oModelo.read(sPath,parametrosDLAnexoRti);
			
			this._anexosRtiDialog.close();
		},
		
		_buscarAnexos: function(oEvent, tipoAnexo){
			var oModelo          = this.getView().getModel();
			var that             = this;
			var oContexto        = oEvent.getSource().getBindingContext().getObject();
			
			if (tipoAnexo == 'RTI'){
				var aFiltroAnexosRti = [];
				
				aFiltroAnexosRti.push(new Filter("Nota", FilterOperator.EQ, oContexto.Nota));
				aFiltroAnexosRti.push(new Filter("NumMedida", FilterOperator.EQ, oContexto.NumMedida));
				aFiltroAnexosRti.push(new Filter("Acao", FilterOperator.EQ, "RTI"));
				
				var parametrosAnexosRti = {
						filters: aFiltroAnexosRti,
						success: function(oData,response){
							that._carregaModeloAnexosRti({"AnexosRti": oData.results})
						}.bind(this),
						error: function(response){
							console.log("erro:" + JSON.stringify(response));
						}.bind(this)
				};
				oModelo.read("/Anexos", parametrosAnexosRti);
				
			} else if (tipoAnexo == 'SOL'){
				var aFiltroAnexosSol = [];
				
				aFiltroAnexosSol.push(new Filter("Nota", FilterOperator.EQ, oContexto.Nota));
				aFiltroAnexosSol.push(new Filter("NumMedida", FilterOperator.EQ, oContexto.NumMedida));
				aFiltroAnexosSol.push(new Filter("Acao", FilterOperator.EQ, "SOL"));
				
				var parametrosAnexosSol = {
						filters: aFiltroAnexosSol,
						success: function(oData,response){
							that._carregaModeloAnexosSol({"AnexosSol": oData.results})
						}.bind(this),
						error: function(response){
							console.log("erro:" + JSON.stringify(response));
						}.bind(this)
				};
				oModelo.read("/Anexos", parametrosAnexosSol);
			}
		},
		
		onFecharDialogAnexos: function(oEvent) {
			var sDialog = oEvent.getSource().oParent.sId
			if (sDialog == 'dialogAnexosRti') {
				this._anexosRtiDialog.close();
			} else if (sDialog == 'dialogAnexosSolic') {
				this._anexosSolicDialog.close();
			};
		}

	});

});