"use strict";!function(e){var n=function(e,n,c){var o,a="@["+n+":]";switch(c){case"remove":o="💀 "+a+" đã bị xóa khỏi nhóm 🧟‍♀";break;case"block":o="☠ "+a+" đã bị chặn khỏi nhóm 🧟‍♂";break;default:o="Không có hành động nào để thực hiện 💥"}t().then(function(n){var t="https://graph.facebook.com/v2.11/"+e+"/comments?access_token="+n,c=new FormData;c.append("message",o);fetch(t,{method:"POST",body:c})})},t=function(){var n=function(n,t){var c=new FormData,o=document.querySelector('[name="fb_dtsg"]');c.append("fb_dtsg",o.value),c.append("app_id","165907476854626"),c.append("redirect_uri","fbconnect://success"),c.append("display","page"),c.append("return_format","access_token"),fetch("https://www.facebook.com/v2.8/dialog/oauth/confirm",{method:"POST",credentials:"include",body:c}).then(function(e){return e.text()}).then(function(c){if(c.includes("access_token="))try{var o=c.match(/access_token=([^&]+)/)[1];e.storage.local.set({c_token:o}),n(o)}catch(e){t()}else t()})};return new Promise(function(t,c){e.storage.local.get({c_token:""},function(e){if(e.c_token){var o=e.c_token;fetch("https://graph.facebook.com/v2.11/me?access_token="+o).then(function(e){return e.json()}).then(function(e){e&&e.id?t(o):n(t,c)},function(){n(t,c)})}else n(t,c)})})};e.runtime.onMessage.addListener(function(t){var c=t.cmd.toLowerCase(),o=t.g,a=t.l,r=t.u;return o?(e.runtime.sendMessage({cmd:"GM.admin",user_id:r,type:c}),void n(a,r,c)):void console.log("no group")})}(chrome);