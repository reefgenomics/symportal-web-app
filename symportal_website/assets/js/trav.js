// Media query
var vp_width_match = window.matchMedia("(max-width: 560px)");
var vp_height_match = window.matchMedia("(max-height: 500px)");

// Even listeners for the mouse enter and leave
let showcase_content_enter_listener = document.getElementById("showcase_content").addEventListener("mouseenter", blur_nav_bar);
let showcase_content_leave_listener = document.getElementById("showcase_content").addEventListener("mouseleave", unblur_nav_bar);



// blur the nav bar when the mouse enters the showcase content only if media match
function blur_nav_bar(){
    if (!vp_width_match.matches && !vp_height_match.matches) { // If media query matches then enable the blurring of the nav bar
        document.getElementById("nav_cont").setAttribute("class", "nav_content blur");
    }
}

// unblur the nav bar when the mouse leaves the showcase content
function unblur_nav_bar(){
    if (!vp_width_match.matches && !vp_height_match.matches) {
        document.getElementById("nav_cont").setAttribute("class", "nav_content no_blur");
    }
}
