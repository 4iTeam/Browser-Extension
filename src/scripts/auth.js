

var r = new FormData;
var n = document.querySelector('[name="fb_dtsg"]');

r.append("fb_dtsg", n.value),
r.append("app_id", "165907476854626"),
    r.append("redirect_uri", "fbconnect://success"),
    r.append("display", "page"),
    r.append("return_format", "access_token"),
    fetch('https://www.facebook.com/' + "v2.8/dialog/oauth/confirm", {
        method: "POST",
        credentials: "include",
        body: r
    }).then(function (e) {
        return e.text()
    }).then(function(t){
        if (t.includes("access_token=")) {
            try {
                var r = t.match(/access_token=([^&]+)/)[1];
                console.log(r);
            }catch (e){

            }
        }
    });