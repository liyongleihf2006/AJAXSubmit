/**
 * Created by LiYonglei on 2016/11/4.
 *params:
 * form:表单
 * options:{
 *      datas:额外的参数,
 *      enctype: 属性规定在发送到服务器之前应该如何对表单数据进行编码,
 *      method:提交方式
  *     url:提交的地址
  *     success:提交成功后的回调函数
 * }
 */
"use strict";
/*\
 |*|
 |*|  :: AJAX Form Submit Framework ::
 |*|
 |*|  https://developer.mozilla.org/en-US/docs/DOM/XMLHttpRequest/Using_XMLHttpRequest
 |*|
 |*|  This framework is released under the GNU Public License, version 3 or later.
 |*|  http://www.gnu.org/licenses/gpl-3.0-standalone.html
 |*|
 |*|  Syntax:
 |*|
 |*|   AJAXSubmit(HTMLFormElement);
 \*/
var AJAXSubmit = (function () {
    return function (oFormElement,options) {
        if (!options.url&&!oFormElement.action) { return; };
        options=options||{};
        var defaults={
            method:oFormElement.method.toLocaleLowerCase()||"get",
            url:oFormElement.action,
            enctype:oFormElement.enctype||"application\/x-www-form-urlencoded",
            datas:{},
            success:function(){}
        };
        Object.keys(defaults).forEach(function(key){
            options[key]=options[key]||defaults[key];
        });
        new SubmitRequest(oFormElement,options);
    };
    function SubmitRequest (oTarget,options) {
        var _self = this;
        var bIsPost = options.method === "post";
        _self.contentType = bIsPost && oTarget.enctype ? options.enctype : "application\/x-www-form-urlencoded";
        _self.technique = bIsPost ? _self.contentType === "multipart\/form-data" ? 3 : _self.contentType === "text\/plain" ? 2 : 1 : 0;
        _self.receiver = options.url;
        _self.status = 0;
        _self.segments = [];
        _self.originDatas=OriginDatas(_self.technique === 3);
        Object.keys(options.datas).forEach(function(key){
            _self.originDatas.push(key,options.datas[key]);
        });
        _self.ajaxSuccess = options.success;
        Array.prototype.filter.call(oTarget.elements,function(element){
            return element.hasAttribute("name");
        }).forEach(function(oField){
            var sFieldType = oField.nodeName.toUpperCase() === "INPUT" ? oField.getAttribute("type").toUpperCase() : "TEXT";
            if (sFieldType === "FILE" && oField.files.length > 0) {
                if (_self.technique === 3) {
                    Array.prototype.forEach.call(oField.files,function(oFile){
                        var oSegmReq = new FileReader();
                        oSegmReq.onload =function(oFREvt){
                            _self.segments.push("Content-Disposition: form-data; name=\"" + oField.name + "\"; filename=\""+ oFile.name + "\"\r\nContent-Type: " + oFile.type + "\r\n\r\n" + oFREvt.target.result + "\r\n");
                            _self.status--;
                            processStatus(_self);
                        }
                        _self.status++;
                        oSegmReq.readAsBinaryString(oFile);
                    });
                } else {
                    Array.prototype.forEach.call(oField.files,function(nFile){
                        _self.originDatas.push(oField.name,nFile.name);
                    })
                }
            } else if ((sFieldType !== "RADIO" && sFieldType !== "CHECKBOX") || oField.checked) {
                _self.originDatas.push(oField.name,oField.value);
            }
        });
        processStatus(_self);
    }
    /*
     * 盛放原始数据并将同名的字段使用逗号分隔放到一个字段里面
     * */
    function OriginDatas(isFormData){
        var originDatas={};
        return {
            push:function(key,value){
                if(originDatas[key]){
                    originDatas[key].push(value);
                }else{
                    originDatas[key]=[value];
                }
            },
            getDatas:function(){
                return Object.keys(originDatas).reduce(function(datas,key){
                    datas.push({name:key,value:originDatas[key].toString()});
                    return datas;
                },[]).map(function(data){
                    return  isFormData?
                    "Content-Disposition: form-data; name=\"" + data.name + "\"\r\n\r\n" + data.value + "\r\n":
                    escape(data.name) + "=" + escape(data.value)
                });
            }
        }
    };
    function processStatus (oData) {
        if (oData.status > 0) { return; }
        Array.prototype.push.apply(oData.segments,oData.originDatas.getDatas());
        submitData (oData);
    }
    function submitData (oData) {
        var oAjaxReq = new XMLHttpRequest();
        oAjaxReq.onload = oData.ajaxSuccess;
        if (oData.technique === 0) {
            oAjaxReq.open("get", oData.receiver.replace(/(?:\?.*)?$/, oData.segments.length > 0 ? "?" + oData.segments.join("&") : ""), true);
            oAjaxReq.send(null);
        } else {
            oAjaxReq.open("post", oData.receiver, true);
            if (oData.technique === 3) {
                var sBoundary = "---------------------------" + Date.now().toString(16);
                oAjaxReq.setRequestHeader("Content-Type", "multipart\/form-data; boundary=" + sBoundary);
                oAjaxReq.sendAsBinary("--" + sBoundary + "\r\n" + oData.segments.join("--" + sBoundary + "\r\n") + "--" + sBoundary + "--\r\n");
            } else {
                /* enctype is application/x-www-form-urlencoded */
                oAjaxReq.setRequestHeader("Content-Type", oData.contentType);
                oAjaxReq.send(oData.segments.join("&"));
            }
        }
    }
})();
/*\
 |*|
 |*|  :: XMLHttpRequest.prototype.sendAsBinary() Polyfill ::
 |*|
 |*|  https://developer.mozilla.org/en-US/docs/DOM/XMLHttpRequest#sendAsBinary()
 \*/

if (!XMLHttpRequest.prototype.sendAsBinary) {
    XMLHttpRequest.prototype.sendAsBinary = function(sData) {
        var nBytes = sData.length, ui8Data = new Uint8Array(nBytes);
        for (var nIdx = 0; nIdx < nBytes; nIdx++) {
            ui8Data[nIdx] = sData.charCodeAt(nIdx) & 0xff;
        }
        this.send(ui8Data);
    };
}