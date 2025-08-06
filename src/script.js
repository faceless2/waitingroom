const PATH = "files/";
const CONFIG = "config-yaml.txt";

const screenWidth = window.innerWidth;
let running = true;
let config;
let lastModified = null;
let index = -1;
let nextChange = 0;
let marquee;

function scroller() {
    let next;
    for (let e=marquee.firstChild;e;e=next) {
        next = e.nextSibling;
        let t = (Date.now() - e.time0) / (e.time1 - e.time0);
        if (t < 0 || t > 1) {
            bump(e);
            if (e.parentElement) {
                next = e.nextSibling;
            }
            t = 0;
        }
        e.x = e.x0 + t * (e.x1 - e.x0);
        if (isNaN(e.x)) throw new Error("NaN point!");
        e.style.transform = "translate(" + Math.round(e.x) + "px, 0)";
    }
    if (running) {
        requestAnimationFrame(scroller);
    }
}

function desc(e) {
    if (!e.nextSibling) {
        return "right";
    } else if (!e.previousSibling) {
        return "left";
    } else {
        let i = 1;
        for (let n = e.parentNode.firstChild;n;n=n.nextSibling) {
            if (n == e) {
                break;
            }
            i++;
        }
        return "child #" + i;
    }
}

function setScroll(e, end) {
    if (typeof end != "number") {
        end = e.x < screenWidth ? -e.width : screenWidth;
    }
    e.x0 = e.x;
    e.x1 = end;
    e.time0 = Date.now();
    e.time1 = e.time0 + Math.abs(e.x0 - e.x1) / config.speed * 1000;
//    console.log("  set " + desc(e) + " to " + e.x0 + "@" + (e.time0-Date.now()) + " to " + e.x1 + "@" + (e.time1-Date.now()));
}

/**
 * Either we're adding content for the first time,
 * or an item has scrolled to the end of it's run;
 * either its scrolled completely off the left-edge
 * or it's about to scroll onto the right-edge
 * @param e the item, or null if we are initializing.
 */
function bump(e) {
    const first = e == null;
    const rightEdge = first || e.x1 > 0;
    console.log("bump: " + (first ? "all" : desc(e)) + " at " + (rightEdge ? "right-edge":"left-edge")+ (first?"":": x="+e.x+" w="+e.width)+" delay="+(nextChange - Date.now()));
    if (Date.now() > nextChange && rightEdge) {
        index++;
        if (index == config.content.length) {
            index = 0;
        }
        console.log("  setting index=" + index);
        let content = config.content[index];
        let time = content.time;
        if (typeof time != "number" || time <= 1) {
            time = 1;
        }
        let target;
        let padding = content.padding;
        padding = padding > 0 ? padding + "px" : 0;
        if ((index & 1) == 1 && content.video) {
            target = document.getElementById("video1");
            target.src = PATH + content.video + "?" + Math.random();
            target.poster = content.image;
        } else if ((index & 1) == 1) {
            target = document.getElementById("img1");
            target.src = PATH + content.image + "?" + Math.random();
        } else if (content.video) {
            target = document.getElementById("video0");
            target.src = PATH + content.video + "?" + Math.random();
            target.poster = content.image;
        } else {
            target = document.getElementById("img0");
            target.src = PATH + content.image + "?" + Math.random();
        }
        document.body.style.background = typeof content.background == "string" ? content.background: null;
        if (content.drift) {
            target.classList.add("kenburns");
            target.style.setProperty("--time", content.time + "s");
            target.style.setProperty("--drift", content.drift);
        } else {
            target.classList.remove("kenburns");
        }
        target.style.padding = padding;
        nextChange = Date.now() + time * 1000;
    }
    if (first) {
        while (marquee.childElementCount < 2 || marquee.lastChild.x < screenWidth) {
            setScroll(buildMarquee(null));
        }
        console.log("Initialized marquee with " + marquee.childElementCount+" children");
    } else if (rightEdge) {
        // The right-most marquee on the list is just about to appear on screen.
        if (e.index != index) {
            // Image has changed; update content.
            // This will change the width, add/remove marquee items as necessary
            buildMarquee(e);
            setScroll(e, -e.width);
            let x0 = marquee.firstChild.x + marquee.firstChild.width;
            // While distance from right-edge of first child to left-edge of last-child
            // is greater than screenWidth, remove last Child.
            let length = marquee.childElementCount;
            while (marquee.lastChild.x - x0 > screenWidth) {
                marquee.lastChild.remove();
            }
            // While distance from right-edge of the left-most to right-edge of the
            // last item is less than screenwidth, add more items.
            last = e;
            while ((marquee.lastChild.x + marquee.lastChild.width) - x0 < screenWidth) {
                let m = buildMarquee(null);
                setScroll(m);
                if (!m.firstChild) {
                    break;
                }
            }
            if (marquee.childElementCount != length) {
                console.log("  change marquee count from " + length + " to " + marquee.childElementCount);
            }
        } else {
            setScroll(e, -e.width);
        }
    } else {
        // The first marquee has scrolled completely off screen. Move it to the end.
        let last = marquee.lastChild;
        e.x = last.x + last.width;
        marquee.appendChild(e);
        setScroll(e);
    }
}

/**
 * Create (or repopulate an existing) marquee item.
 * Set its x and width based on the previous item, if any
 * If any items follow it, adjust their positions so they don't overlap this one
 */
function buildMarquee(e) {
    const content = config.content[index];
    const create = e == null;
    if (create) {
        e = document.createElement("div");
        let last = marquee.lastChild;
        marquee.appendChild(e);
        e.x = last ? last.x + last.width : 0;
    } else {
        while (e.firstChild) {
            e.firstChild.remove();
        }
    }
    if (content.text) {
        content.text.forEach((t) => {
            let s = document.createElement("span");
            s.appendChild(document.createTextNode(t));
            e.appendChild(s);
        });
        e.index = index;
        e.width = e.clientWidth;
        if (!(e.width > 0)) {
            throw new Error("Zero width");
        }
        for (let n=e.nextSibling;n;n=n.nextSibling) {
            n.x = n.previousSibling.x + n.previousSibling.width;
        }
        marquee.classList.remove("empty");
    } else {
        let s = document.createElement("span");
        e.appendChild(s);
        e.index = index;
        e.width = content.time * config.speed / 2;
        marquee.classList.add("empty");
    }
    return e;
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
        if (Array.isArray(c.text)) {
            for (let i=0;i<c.text.length;i++) {
                if (!typeof c.text[i] == "string" || c.text[i].length == 0) {
                    c.text.splice(i--);
                }
            }
            if (c.text.length == 0) {
                delete c.text;
            }
        } else {
            delete c.text;
        }
    });
    marquee = document.getElementById("marquee");
    while (marquee.firstChild) {
        marquee.firstChild.remove();
    }
    console.log("LOAD: " + JSON.stringify(config));
    bump(null);
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
//    document.getElementById("clock").addEventListener("click",() => { running = !running });
}

function initialize() {
    // poll "config.js" every 5s and reload entire page if it's changed
    fetch(PATH + CONFIG "?" + Math.random()).then((r) => {
        let when = new Date(r.headers.get("last-modified")).getTime();
        if (lastModified == null) {
            lastModified = when;
            r.text().then((text) => {
                loader(jsyaml.load(text));
            });
        } else if (when > lastModified) {
            location.reload();
        }
    });
    setTimeout(initialize, 5000);
}
