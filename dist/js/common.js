$(function() {
    $(" .content li").each(function (i) {
        if ((i + 1) % 3 == 0) {
            $(this).css({"border-right": 0})
        }
    });

    /************ 交易-价格排序 **********/
    $(".deal-tab li").click(function(){
        $(this).addClass('current').siblings('li').removeClass('current');
        if($(this).children('div').length>0){
            if($(this).children('div').hasClass('down')){
                $(this).children('div').removeClass('down').addClass('up');
            }
            else{
                $(this).children('div').removeClass('up').addClass('down');
            }
        }
        else{
            $(this).siblings('li').children('div').removeClass('down').removeClass('up');
        }
    });
});
