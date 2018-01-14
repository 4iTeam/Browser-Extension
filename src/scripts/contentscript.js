"use strict";
!function (e, g) {
    function t(e) {
        var t = Object.keys(e).map(function (o) {
            return encodeURIComponent(o) + "=" + encodeURIComponent(e[o])
        }).join("&");
        return t
    }

    e.runtime.onMessage.addListener(function (n) {
        var c = n.cmd.toLowerCase();
        if ("block" === c || "remove" === c) {
            var u = n.u, f = document.querySelector('[name="fb_dtsg"]');
            if (null !== f) {
                var s = {fb_dtsg: f.value, confirm: !0, __user: n.cu, __a: 1};
                "block" === c && (s.ban_user = 1),
                    fetch("https://www.facebook.com/ajax/groups/members/remove.php?group_id=" + g + "&uid=" + u + "&is_undo=0", {
                    method: "POST",
                    credentials: "include",
                    body: t(s)
                }).then(function () {
                    e.runtime.sendMessage({cmd: "GM.admin", user_id: u, type: c})
                })
            }
        }
    });

}(chrome, "1415192401896193");
