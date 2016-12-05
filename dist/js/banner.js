$(function(){
    var iSpeed = 2000;
    var imgList=$(".bannerImg li");
    var i=0;
    var timer = setInterval(bannerImg, iSpeed);

    $(".bannerSrc li").each(function (index) {
        $(this).click(function () {
            i=index-1;
            bannerImg();
        })
    });

    function bannerImg(){
        imgList.css({"opacity":"0"});
        imgList.eq(i).css({"opacity":"0.5","z-index":"3"});
        i++;
        if(i==imgList.length)
        {
            i=0;
        }
        imgList.eq(i).css({"display":"block","z-index":"4"}).animate({"opacity":"1"},500);
        $(".bannerSrc li:eq("+i+")").addClass("active").siblings().removeClass("active");
    }
})