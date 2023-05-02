sap.ui.define([], function () {
	"use strict";

	return {

		/**
		 * Rounds the number unit value to 2 digits
		 * @public
		 * @param {string} sValue the number string to be rounded
		 * @returns {string} sValue with 2 digits rounded
		 */
		numberUnit : function (sValue) {
			if (!sValue) {
				return "";
			}
			return parseFloat(sValue).toFixed(2);
		},
		
		formataZerosEsquerda: function(sValue){
			if (sValue) {
				return sValue*1;
			}
		},
		
		formataNA: function(sValue){
			if (!sValue) {
				return "-";
			} else {
				return sValue;
			}
		},
		
		formataData: function(sValue) {
			if (!sValue) {
				return "Sem Data Definida";
			}
		},
		
		formataHora: function(sValue) {
			if (!sValue) {
				return "Sem Hora Definida";
			}
		}

	};

});