
/**
 * ScrollFix v0.1
 * http://www.joelambert.co.uk
 *
 * Copyright 2011, Joe Lambert.
 * Free to use under the MIT license.
 * http://www.opensource.org/licenses/mit-license.php
 * <div class="scrollable" id="scrollable">
 <ul>
 <li>List Item</li>
 <li>List Item</li>
 <li>List Item</li>
 <li>List Item</li>
 <li>List Item</li>
 <li>List Item</li>
 </ul>
 </div>

 Then call the following code on the area that has the overflow: scroll property:

 var scrollable = document.getElementById("scrollable");
 new ScrollFix(scrollable);
 解决滚动ios出界
 */
var ScrollFix = function(elem) {
    // Variables to track inputs
    var startY, startTopScroll;

    elem = elem || document.querySelector(elem);

    // If there is no element, then do nothing
    if(!elem)
        return;

    // Handle the start of interactions
    elem.addEventListener('touchstart', function(event){
        startY = event.touches[0].pageY;
        startTopScroll = elem.scrollTop;

        if(startTopScroll <= 0)
            elem.scrollTop = 1;

        if(startTopScroll + elem.offsetHeight >= elem.scrollHeight)
            elem.scrollTop = elem.scrollHeight - elem.offsetHeight - 1;
    }, false);
};