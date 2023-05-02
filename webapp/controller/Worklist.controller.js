sap.ui.define([
	"./BaseController",
	"sap/ui/model/json/JSONModel",
	"../model/formatter",
	"../model/helper",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/m/MessagePopover",
	"sap/m/MessagePopoverItem",
	"sap/m/PDFViewer",
	"sap/m/MessageToast"
], function (BaseController, JSONModel, formatter, helper, Filter, FilterOperator, MessagePopover, MessagePopoverItem, PDFViewer, MessageToast) {
	"use strict";

	return BaseController.extend("br.com.petrobras.pm.yspm_medidas_b.controller.Worklist", {

		formatter: formatter,

		/* =========================================================== */
		/* lifecycle methods                                           */
		/* =========================================================== */

		/**
		 * Called when the worklist controller is instantiated.
		 * @public
		 */
		onInit : function () {
			var oViewModel,
				iOriginalBusyDelay,
				oTable = this.byId("table");

			// Put down worklist table's original value for busy indicator delay,
			// so it can be restored later on. Busy handling on the table is
			// taken care of by the table itself.
			iOriginalBusyDelay = oTable.getBusyIndicatorDelay();
			// keeps the search state
			this._aTableSearchState = [];

			// Model used to manipulate control states
			oViewModel = new JSONModel({
				worklistTableTitle : this.getResourceBundle().getText("worklistTableTitle"),
				shareOnJamTitle: this.getResourceBundle().getText("worklistTitle"),
				shareSendEmailSubject: this.getResourceBundle().getText("shareSendEmailWorklistSubject"),
				shareSendEmailMessage: this.getResourceBundle().getText("shareSendEmailWorklistMessage", [location.href]),
				tableNoDataText : this.getResourceBundle().getText("tableNoDataText"),
				tableBusyDelay : 0
			});
			this.setModel(oViewModel, "worklistView");
			
			var mCentro = new JSONModel({
					Werks: "",
					Name1: ""
				});
			this.setModel(mCentro, "mCentroModel");
			
			var oListaMedidas = new JSONModel({
					Nota: "",
					NumMedida: "",
					Centro: "",
					LocInstalacao: "",
					Flag: ""
			});
			this.setModel(oListaMedidas, "mListaMedidas");
			
			//var mMedidasModel = new JSONModel();
			//this.setModel(mMedidasModel, "mMedidas");

			// Make sure, busy indication is showing immediately so there is no
			// break after the busy indication for loading the view's meta data is
			// ended (see promise 'oWhenMetadataIsLoaded' in AppController)
			oTable.attachEventOnce("updateFinished", function(){
				// Restore original busy indicator delay for worklist's table
				oViewModel.setProperty("/tableBusyDelay", iOriginalBusyDelay);
			});
		},

		/* =========================================================== */
		/* event handlers                                              */
		/* =========================================================== */

		/**
		 * Triggered by the table's 'updateFinished' event: after new table
		 * data is available, this handler method updates the table counter.
		 * This should only happen if the update was successful, which is
		 * why this handler is attached to 'updateFinished' and not to the
		 * table's list binding's 'dataReceived' method.
		 * @param {sap.ui.base.Event} oEvent the update finished event
		 * @public
		 */
		onUpdateFinished : function (oEvent) {
			// update the worklist's object counter after the table update
			var sTitle,
				oTable = oEvent.getSource(),
				iTotalItems = oEvent.getParameter("total");
			// only update the counter if the length is final and
			// the table is not empty
			if (iTotalItems && oTable.getBinding("items").isLengthFinal()) {
				sTitle = this.getResourceBundle().getText("worklistTableTitleCount", [iTotalItems]);
			} else {
				sTitle = this.getResourceBundle().getText("worklistTableTitle");
			}
			this.getModel("worklistView").setProperty("/worklistTableTitle", sTitle);
		},

		/**
		 * Event handler when a table item gets pressed
		 * @param {sap.ui.base.Event} oEvent the table selectionChange event
		 * @public
		 */
		onNavegarMedida : function (oEvent) {
			// The source is the list item that got pressed
			this._showObject(oEvent.getSource());
		},

		/**
		 * Event handler for navigating back.
		 * We navigate back in the browser history
		 * @public
		 */
		onNavBack : function() {
			// eslint-disable-next-line sap-no-history-manipulation
			history.go(-1);
		},

		onSearch : function (oEvent) {
			if (oEvent.getParameters().refreshButtonPressed) {
				// Search field's 'refresh' button has been pressed.
				// This is visible if you select any master list item.
				// In this case no new search is triggered, we only
				// refresh the list binding.
				this.onRefresh();
			} else {
				var aTableSearchState = [];
				var sQuery = oEvent.getParameter("query");

				if (sQuery && sQuery.length > 0) {
					aTableSearchState = [new Filter("Nota", FilterOperator.Contains, sQuery)];
				}
				this._applySearch(aTableSearchState);
			}
		},
		
		onExibirRelInsp: function (oEvent) {
			var pdfViewer = new PDFViewer();
			var sService  = this.getView().getModel().sServiceUrl;
			var oTabela   = this.byId("table");
			var aItens    = oTabela.getSelectedContexts();
			
			if (aItens.length == 1){
				var oItem = aItens[0].getObject()
				var sPath = sService + "/Medidas(Nota='" + oItem.Nota + "',NumMedida='" + oItem.NumMedida + "',Centro='" + oItem.Centro + "',LocInstalacao='" + oItem.LocInstalacao + "')/$value"
				this.getView().addDependent(pdfViewer);
				pdfViewer.setSource(sPath);
				pdfViewer.setTitle("Relatório de Inspeção:" + oItem.NumObj)
				pdfViewer.open();
			} else {
				MessageToast.show("Selecionar 1 item para exibição do Relatório de Inspeção");
			};
		},

		/**
		 * Event handler for refresh event. Keeps filter, sort
		 * and group settings and refreshes the list binding.
		 * @public
		 */
		onRefresh : function () {
			var oTable = this.byId("table");
			oTable.getBinding("items").refresh();
		},
		
		onSearchHelpCentro: function(oEvent) {
			this.inputId = oEvent.getSource().getId();
			
			if (!this._valueHelpDialog) {
				this._valueHelpDialog = sap.ui.xmlfragment("br.com.petrobras.pm.yspm_medidas_b.view.F4Centros", this);
			}
			this.getView().addDependent(this._valueHelpDialog);
			this._carregarF4Centros();
			this._valueHelpDialog.open();
		},
		
		onLiveChangeCentro: function(oEvent) {
			var sValue = oEvent.getParameter("value");
			var oFiltro = new Filter("Werks", FilterOperator.Contains, sValue);
			this._carregarF4Centros(oFiltro);
		},
		
		totalMedidasSelecionadas: 0,
		totalMensagens: 0,
		listaMensagens: undefined,
		
		onAprovar: function(oEvent) {			
			var that     = this;
			var entidade = this.preencheEntidade();
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
					var sPath        = "/Medidas(Nota='" + entidade.parametros[i].Nota + 
												"',NumMedida='" + entidade.parametros[i].NumMedida +
												"',Centro='" + entidade.parametros[i].Centro +
												"',LocInstalacao='" + entidade.parametros[i].LocInstalacao + "')";
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
		
		preencheEntidade: function () {
			var listagem = {};
			listagem.parametros = [];
			
			var oTabela            = this.byId("table");
			var itensSelecionados  = oTabela.getSelectedItems();
			itensSelecionados.forEach(function(item){
				var Nota           = item.getBindingContext("mMedidas").getProperty("Nota");
				var NumMedida      = item.getBindingContext("mMedidas").getProperty("NumMedida");
				var Centro         = item.getBindingContext("mMedidas").getProperty("Centro");
				var LocInstalacao  = item.getBindingContext("mMedidas").getProperty("LocInstalacao");
				var Qsmnum         = item.getBindingContext("mMedidas").getProperty("Qsmnum");
				var QtdMonitoracao = item.getBindingContext("mMedidas").getProperty("QtdMonitoracao"); 
			
				var parametro = {};
			
				parametro.Nota           = Nota;
				parametro.NumMedida      = NumMedida;
				parametro.Centro         = Centro;
				parametro.LocInstalacao  = LocInstalacao;
				parametro.Qsmnum         = Qsmnum;
				parametro.QtdMonitoracao = QtdMonitoracao
				
				listagem.parametros.push(parametro);
			});
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
		 * Shows the selected item on the object page
		 * On phones a additional history entry is created
		 * @param {sap.m.ObjectListItem} oItem selected Item
		 * @private
		 */
		
		_carregarF4Centros: function(oFiltro) {
			var modelo = this.getView().getModel();
			var aFiltroCentro = oFiltro ? [oFiltro] : [];
			var that = this;
			var parametrosCentro = {
				filters: aFiltroCentro,
				success: function(oData, response){
					that._carregaModeloCentros({"Centros": oData.results});
				}.bind(this),
				error: function(response){
					console.log("erro:" + JSON.stringify(response));
				}.bind(this)
			};
			modelo.read("/Centros", parametrosCentro);
		},
		
		_carregaModeloCentros: function(aCentros) {
			this.getView().setModel(new JSONModel(aCentros), "mF4Centros");
		},
		
		_handleValueHelpClose: function(oEvent) {
			var oSelectedItem = oEvent.getParameter("selectedItem");
			if (oSelectedItem) {
				var oCentro = this.getView().getModel("mCentroModel");
				oCentro.setProperty("/Werks", oSelectedItem.getTitle());
				oCentro.setProperty("/Name1", oSelectedItem.getDescription());
				var centroInput = this.byId(this.inputId);
				centroInput.setValue(oCentro.getProperty("/Werks"));
				
				var oFiltroInst = new Filter("Werks", FilterOperator.EQ, oCentro.getProperty("/Werks"));
				this._carregaModeloSelectInstalacoes(oFiltroInst);
				
			} else { 
				var oCentro = this.getView().getModel("mCentroModel");
				oCentro.setProperty("/Werks", "");
				oCentro.setProperty("/Name1", ""); 
				var centroInput = this.byId(this.inputId);
				centroInput.setValue(oCentro.getProperty("/Werks"));
			}
		},
		
		_carregaModeloSelectInstalacoes: function(oFiltro) {
			var modelo = this.getView().getModel();
			var aFiltroInst = oFiltro ? [oFiltro] : [];
			var that = this;
			var parametrosInstalacoes = {
				filters: aFiltroInst,
				success: function(oData, response){
					that._carregaModeloInst({"LocsInst": oData.results});
				}.bind(this),
				error: function(response){
					console.log("erro:" + JSON.stringify(response));
				}.bind(this)
			};
			modelo.read("/LocaisInstalacao", parametrosInstalacoes);
		},
		
		_carregaModeloInst: function(aCentros) {
			this.getView().setModel(new JSONModel(aCentros), "mLocsInst");
		},
		
		_showObject : function (oItem) {
			var Contexto = {
					Nota:          oItem.getBindingContext("mMedidas").getProperty("Nota"),
					NumMedida:     oItem.getBindingContext("mMedidas").getProperty("NumMedida"),
					Centro:        oItem.getBindingContext("mMedidas").getProperty("Centro"),
					LocInstalacao: oItem.getBindingContext("mMedidas").getProperty("LocInstalacao")					
			};
			if (Contexto.LocInstalacao === ""){
				Contexto.LocInstalacao = " ";
			};
			this.getRouter().navTo("object", Contexto, true);
		},
		
		onListar: function(oEvent) {
			var oModeloListaMedidas = this.getView().getModel("mListaMedidas");
			var centroInput         = this.byId(this.inputId);
			var oLocInstalacao      = this.getView().byId("selectLocInstalacao");
			var oChkTdsAtivos       = this.getView().byId("chkTdsAtivos");
			
			oModeloListaMedidas.setProperty("/Centro", centroInput.getValue());
			oModeloListaMedidas.setProperty("/LocInstalacao", oLocInstalacao.getSelectedKey());
			oModeloListaMedidas.setProperty("/Flag", oChkTdsAtivos.getSelected());
			
			var aFiltroMedidas = [];
			aFiltroMedidas.push(new Filter("Centro", FilterOperator.EQ, oModeloListaMedidas.getProperty("/Centro")));
			aFiltroMedidas.push(new Filter("LocInstalacao", FilterOperator.EQ, oModeloListaMedidas.getProperty("/LocInstalacao")));
			aFiltroMedidas.push(new Filter("FlagTdsAtivos", FilterOperator.EQ, oModeloListaMedidas.getProperty("/Flag")));
			
			this._carregaModeloListaMedidas(aFiltroMedidas);
		},
		
		_carregaModeloListaMedidas: function(aFiltro) {
			var modelo = this.getView().getModel();
			var aFiltroListaMedida = aFiltro ? aFiltro : [];
			var that = this;
			
			var mMedidasModel = this.getView().getModel("mMedidas");
			
			var parametrosMedidas = {
				filters: aFiltroListaMedida,
				success: function(oData, response){
					that._carregaModeloMedidas({"Medidas": oData.results});
				}.bind(this),
				error: function(response){
					console.log("erro:" + JSON.stringify(response));
				}.bind(this)
			};
			modelo.read("/Medidas", parametrosMedidas);
		},
		
		_carregaModeloMedidas: function(aMedidas) {
			this.getView().setModel(new JSONModel(aMedidas), "mMedidas");
		},

		/**
		 * Internal helper method to apply both filter and search state together on the list binding
		 * @param {sap.ui.model.Filter[]} aTableSearchState An array of filters for the search
		 * @private
		 */
		_applySearch: function(aTableSearchState) {
			var oTable = this.byId("table"),
				oViewModel = this.getModel("worklistView");
			oTable.getBinding("items").filter(aTableSearchState, "Application");
			// changes the noDataText of the list in case there are no filter results
			if (aTableSearchState.length !== 0) {
				oViewModel.setProperty("/tableNoDataText", this.getResourceBundle().getText("worklistNoDataWithSearchText"));
			}
		}
	});
});