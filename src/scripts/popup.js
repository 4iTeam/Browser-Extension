"use strict";
!function (n) {
    var current_version=n.app.getDetails().version;
    $('#version').html(current_version);
    function versionCompare(v1, v2, options) {
        var lexicographical = options && options.lexicographical,
            zeroExtend = options && options.zeroExtend,
            v1parts = v1.split('.'),
            v2parts = v2.split('.');

        function isValidPart(x) {
            return (lexicographical ? /^\d+[A-Za-z]*$/ : /^\d+$/).test(x);
        }

        if (!v1parts.every(isValidPart) || !v2parts.every(isValidPart)) {
            return NaN;
        }

        if (zeroExtend) {
            while (v1parts.length < v2parts.length) v1parts.push("0");
            while (v2parts.length < v1parts.length) v2parts.push("0");
        }

        if (!lexicographical) {
            v1parts = v1parts.map(Number);
            v2parts = v2parts.map(Number);
        }

        for (var i = 0; i < v1parts.length; ++i) {
            if (v2parts.length == i) {
                return 1;
            }

            if (v1parts[i] == v2parts[i]) {
                continue;
            }
            else if (v1parts[i] > v2parts[i]) {
                return 1;
            }
            else {
                return -1;
            }
        }

        if (v1parts.length != v2parts.length) {
            return -1;
        }

        return 0;
    }

    n.storage.local.get({new_version:0},function(v){
        if(v.new_version){
            if(versionCompare(current_version,v.new_version)<0){
                $('#new-version').removeClass('hidden');
            }
        }
    });
    n.storage.local.get({id:0,spam:0,rank: 0,name:'',post:0,like:0,comment:0,liked:0,commented:0}, function (n) {
        if(n.id){
            var img='https://graph.facebook.com/'+n.id+'/picture?width=32';
            $('#avatar').attr('src',img);
        }
        var hasData=false;
        $.each(n,function(k,v){
            if(v){
                $('#'+k).removeClass('hidden').find('.data').html(v);
                hasData=true;
            }
        });
        if(!hasData){
            $('#error').show();
            $('#info').hide();
        }
    })
}(chrome);