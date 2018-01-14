"use strict";
!function (n) {

    n.storage.local.get({rank: 0,name:'',post:0,like:0,comment:0,liked:0,commented:0}, function (n) {
        $.each(n,function(k,v){
            if(v){
                $('#'+k).removeClass('hidden').find('.data').html(v);
            }
        })
    })
}(chrome);