"use strict";
!function (n) {
    var current_version=n.app.getDetails().version;
    $('#version').html(current_version);
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