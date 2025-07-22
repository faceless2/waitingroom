let config;
let lastScroll = null;
let lastModified = null;
let marquee = [];
let index = -1;
let nextChange = 0;
let lastupdate = 0;
const screenWidth = window.innerWidth;

function scroller() {
    for (let i=0;i<2;i++) {
        let e = marquee[i];
        let t = (Date.now() - e.time0) / (e.time1 - e.time0);
        if (t < 0 || t > 1) {
            nextItem(e);
            t = 0;
        }
        e.x = e.x0 + t * (e.x1 - e.x0);
        e.style.transform = "translate(" + Math.round(e.x) + "px, 0)";
    }
    requestAnimationFrame(scroller);
}

function nextItem(marqueeChange) {
    const first = marqueeChange == null;
    console.log("nextItem: updatdating marquee " + (first ? "all" : marqueeChange.id));
    if (Date.now() > nextChange) {
        index++;
        console.log("  first changing image to " + index);
        if (index == config.content.length) {
            index = 0;
        }
        let content = config.content[index];
        let time = content.time;
        if (typeof time != "number" || time <= 5000) {
            time = 5000;
        }
        let target;
        if ((index & 1) == 1 && content.video) {
            target = document.getElementById("video1");
            target.src = content.video;
            target.poster = content.image;
        } else if ((index & 1) == 1) {
            target = document.getElementById("img1");
            target.src = content.image;
        } else if (content.video) {
            target = document.getElementById("video0");
            target.src = content.video;
            target.poster = content.image;
        } else {
            target = document.getElementById("img0");
            target.src = content.image;
        }
        nextChange = Date.now() + time;
    }
    for (let i=0;i<2;i++) {
        const e = marquee[i];
        if (marqueeChange == null || e == marqueeChange) {
            if (e.index != index) {
                while (e.firstChild) {
                    e.firstChild.remove();
                }
                config.content[index].text.forEach((t) => {
                    let s = document.createElement("span");
                    s.innerHTML = t;
                    e.appendChild(s);
                });
                let html = e.innerHTML;
                while (e.clientWidth < screenWidth) {
                    e.innerHTML += html;
                }
                e.index = index;
                e.width = e.clientWidth;
            }
            if (first) {
                e.x = i == 0 ? 0 : marquee[0].width;
            } else {
                e.x = marquee[1 - i].x + marquee[1 - i].width;
            }
            e.x0 = e.x;
            // e.x1 = screenWidth - marquee[0].width - marquee[1].width;        // good, but we need to adjust the item widths to fill
            e.x1 = -e.width;
            e.time0 = Date.now();
            e.time1 = e.time0 + Math.abs(e.x0 - e.x1) / config.speed * 1000;
            console.log("  set marquee " + i + " to " + e.x0 + "@" + (e.time0-Date.now()) + " to " + e.x1 + "@" + (e.time1-Date.now()));
        }
    }
}

function clock() {
    let date = new Date();
    document.getElementById("clock").innerHTML = moment().format("ddd, d MMM  HH:mm");
    let delay = 60000 - (Date.now() % 60000);
    setTimeout(clock, delay);
}

function loader(c) {
    config = c;
    config.content.forEach((c) => {
        if (typeof c.text == "string") {
            c.text = [ c.text ];
        }
    });
    console.log("LOAD: " + JSON.stringify(config));
    marquee = [
        document.getElementById("marquee0"),
        document.getElementById("marquee1")
    ];
    for (let i=0;i<2;i++) {
        let e = marquee[i];
        e.startX = e.x = e.width = 0;
        e.startTime = Date.now();
    }
    nextItem(null);
    requestAnimationFrame(scroller);
    clock();
    let callback = (e) => {
        console.log("fade in " + e.id);
        document.querySelectorAll(".fade.fade-active").forEach((e) => {
            e.style.transform = window.getComputedStyle(e).transform;
            e.classList.remove("fade-active");
        });
        e.classList.add("fade-active");
        e.style.transform = null;
    };
    document.querySelectorAll(".fade").forEach((e) => {
        e.addEventListener("animationend", (ev) => {
            if (ev.animationName == "fade-out") {
                e.src = "";
            }
        });
        if (e.tagName == "VIDEO") {
            e.addEventListener("loadeddata", () => { callback(e); });
        } else {
            e.addEventListener("load", () => { callback(e); });
        }
    });
}

function initialize() {
    // poll "config.js" every 5s and reload entire page if it's changed
    fetch("config.js?" + Math.random()).then((r) => {
        let when = new Date(r.headers.get("last-modified")).getTime();
        if (lastModified == null) {
            lastModified = when;
            r.json().then((j) => {
                loader(j);
            });
        } else if (when > lastModified) {
            location.reload();
        }
    });
    setTimeout(initialize, 5000);
}
