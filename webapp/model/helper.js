(function() {

	Helper = {
			
			
		/////////////////////////////////////////////////////
		// M E N S A G E N S
		/////////////////////////////////////////////////////

		_obtemIcone: function (tipo) {
			var retorno = "none";
			if (tipo && tipo === "info") {
				retorno = "information";
			} else {
				retorno = tipo;
			}  
			return 'sap-icon://message-' + retorno;
		},

		_obtemEstado: function (tipo) {
			var retorno = "None";
			if (tipo && tipo === "error") {
				retorno = "Error";
			} else if (tipo && tipo === "warning") {
				retorno = "Warning";
			} else if (tipo && tipo === "success") {
				retorno = "Success";
			} 
			return retorno;
		},
		
		formataMensagem: function(mensagens) {
			var retorno = [];
			var message = null;
			if (Array.isArray(mensagens)) {
				message  = mensagens[0];
				mensagens.shift();
				message.details = mensagens;
			} else {
				message = mensagens;
			}
			
			if (message && message.message) {
				
				var textoMensagem  = message.message + (message.code ? " (" + message.code + ")": "");
				var iconeMensagem  = this._obtemIcone(message.severity);
				var estadoMensagem = this._obtemEstado(message.severity);
				var mensagem = new sap.m.ObjectStatus({
					icon:  iconeMensagem,
					state: estadoMensagem,
					text:  textoMensagem
				});
				retorno.push(mensagem);
				if (message.details && message.details.length) {
					for (var i=0; i < message.details.length; i++) {
						var mensagens = this.formataMensagem(message.details[i]);
						for (var j=0; j < mensagens.length; j++) {
							retorno.push(mensagens[j]);
						}
					}
				}
			}
			return retorno;
		},

		exibeMensagem: function(mensagens, titulo, componente, detalhes) {
			if (!titulo) {
				titulo = "Mensagem";
			}
			
			var tipo = (sap.ui.Device.system.phone) ? "Standard" : "Message";
			
			var conteudo = this.formataMensagem(mensagens);
			
			if (detalhes) {
				try{
					var json = JSON.parse(detalhes);
					detalhes = detalhes.replace(/[{"]/gi, '').replace(/[},]/gi, '\n');
				} catch(e) {}
				
				var detalhesMensagem = new sap.m.TextArea({rows : 15, visible: false});
				detalhesMensagem.setValue(detalhes);
				detalhesMensagem.setWidth('100%');
				conteudo.push(detalhesMensagem);

				var linkDetalhes = new sap.m.Link({
					id    : 'linkDetalhes',
					text  : 'detalhes',
					press : function() {
						detalhesMensagem.setVisible(true);
						linkDetalhes.setVisible(false);
					}
				});
				
				conteudo.push(linkDetalhes);
			}
			
	        var myDialog = new sap.m.Dialog({
	            title          : titulo,
	            type           : tipo,
	            stretchOnPhone : true,
	            content        : conteudo,
	            endButton      : new sap.m.Button({
	                text: "OK",
	                press: function() {
	                	if (componente && componente.onNavBack) {
	                		componente.onNavBack();
	                	}
	                    myDialog.close();
	                } 
	            }),
	            afterClose: function() {
	                myDialog.destroy();
	            }
	        });
	        
	        myDialog.open();
		},
		
		/////////////////////////////////////////////////////
		// V I E W   M A S T E R
		/////////////////////////////////////////////////////

		obtemViewMaster: function(aplicacao) {
			try {
				if (aplicacao && aplicacao._oViews && aplicacao._oViews._oViews) {
					var viewMaster = aplicacao._oViews._oViews["br.com.petrobras.fi.solcci.view.Master"]; 
					if (viewMaster) {
						return viewMaster.getController();
					}
				}
			} catch(e) {
				console.log('Não foi possível obter a view Master');
			}
			return undefined;
		},
		
		/////////////////////////////////////////////////////
		// V A L I D A Ç Õ E S
		/////////////////////////////////////////////////////
		
		validaCPF: function(cpf) {
			var numeros, digitos, soma, i, resultado, digitos_iguais;
			
			digitos_iguais = 1;
			if (cpf.length < 11) {
				return false;
			}
			
			cpf = cpf.replace(/[^0-9]/g,"");
			
			for (i = 0; i < cpf.length - 1; i++) {
				if (cpf.charAt(i) != cpf.charAt(i + 1)) {
					digitos_iguais = 0;
					break;
				}
			}
			
			if (!digitos_iguais) {
				numeros = cpf.substring(0,9);
				digitos = cpf.substring(9);
				soma    = 0;

				for (i = 10; i > 1; i--) {
					soma += numeros.charAt(10 - i) * i;
				}
				
				resultado = soma % 11 < 2 ? 0 : 11 - soma % 11;
				if (resultado != digitos.charAt(0)) {
					return false;
				}
				
				numeros = cpf.substring(0,10);
				soma    = 0;
				
				for (i = 11; i > 1; i--) {
					soma += numeros.charAt(11 - i) * i;
				}
				resultado = soma % 11 < 2 ? 0 : 11 - soma % 11;

				if (resultado != digitos.charAt(1)) {
					return false;
				}
				return true;
			}
			return false;
		}

	};

	return Helper;

}());