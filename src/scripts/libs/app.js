var app=app||{};!function(e,t,a){e.ready=function(e){return this.rd=e,this};!function(){t.storage.local.get({config:{}},function(t){e._config=t.config||{},e.rd&&e.rd()})}(),e.loadUserInfo=function(){t.storage.local.get({user:{id:0,spam:0,rank:0,name:"",post:0,like:0,comment:0,liked:0,commented:0,success:0}},function(e){if(e=e.user,e.id){var t="https://graph.facebook.com/"+e.id+"/picture?width=32&height=32";$("#avatar").attr("src",t)}var n=!1;$.each(e,function(e,t){t&&($("#"+e).removeClass("hidden").find(".data").html(t),n=!0)}),e.success&&n||($("#error").removeClass("hidden"),$("#info").addClass("hidden"))})},e.checkVersion=function(){var a=n.app.getDetails().version;$("#version").html(a),t.storage.local.get({new_version:0},function(t){t.new_version&&e.versionCompare(a,t.new_version)<0&&$("#new-version").removeClass("hidden")})},e.template=_.memoize(function(e){var t,n,a={evaluate:/<#([\s\S]+?)#>/g,interpolate:/\{\{\{([\s\S]+?)\}\}\}/g,escape:/\{\{([^\}]+?)\}\}(?!\})/g};return n=-1===e.indexOf("<")?$("#tmpl-"+e).html():e,function(e){return(t=t||_.template(n,a))(e)}}),$.fn.tabs=function(){return this.each(function(e){var t=$(this),n=t.closest(".has-tabs").children(".tab-content");t.on("click","a",function(e){e.preventDefault(),$(this).siblings().removeClass("active"),$(this).addClass("active"),n.addClass("hidden"),$("#"+$(this).data("tab")).removeClass("hidden"),t.trigger("tab",$(this).data("tab"))})}),this}}(app,chrome);