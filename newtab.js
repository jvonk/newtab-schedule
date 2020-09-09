function ISODateString(d) {
    function pad(n) { return n < 10 ? '0' + n : n }
    return d.getUTCFullYear() + '-'
        + pad(d.getUTCMonth() + 1) + '-'
        + pad(d.getUTCDate()) + 'T'
        + pad(d.getUTCHours()) + ':'
        + pad(d.getUTCMinutes()) + ':'
        + pad(d.getUTCSeconds()) + 'Z'
}
function getDate(d) {
    return new Date(d.dateTime || d.date || d)
}
function getStart(e) {
    return e.start || e.due_at || e.lock_at || e.all_day_date || e.unlock_at || e.created_at
}
function getEnd(e) {
    return e.end || e.due_at || e.lock_at || e.all_day_date || e.unlock_at || e.created_at
}
function getLink(e) {
    if (e.html_url)
        return e.html_url
    if (e.description && e.description.endsWith('/details')) {
        return e.description.substr(e.description.lastIndexOf('https://classroom.google'), e.description.length).replace('classroom.google.com/', 'classroom.google.com/u/1/')
    }
    return e.htmlLink
}
function formatDate(d1, d2) {
    if (d1.getTime() == d2.getTime())
        return d1.toLocaleString('en-us', { month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric' })
    else if (d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate())
        return d1.toLocaleString('en-us', { month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric' }) + ' - ' + d2.toLocaleString('en-us', { hour: 'numeric', minute: 'numeric' })
    else if (d1.getDate() + 1 === d2.getDate() && ((d1.getUTCHours() == 0 && d2.getUTCHours() == 0) || (d1.getHours() == 0 && d2.getHours() == 0)))
        return d1.toLocaleString('en-us', { month: 'numeric', day: 'numeric' })
    else
        return d1.toLocaleString('en-us', { month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric' }) + ' - ' + d2.toLocaleString('en-us', { month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric' })
}

function cellClick(cell) {
    console.log('click', cell)
    var editBox = document.createElement('input')
    var style = getComputedStyle(cell)
    for (var s in style) {
        console.log(s, style[s])
        editBox.style[s] = style[s]
    }
    if (cell.children.length > 0) {
        editBox.value = cell.childNodes[0].href
    } else {
        editBox.value = cell.innerText
    }
    if (cell.childNodes[0]) {
        cell.removeChild(cell.childNodes[0])
    }
    cell.appendChild(editBox)
    cell.onclick = ''
    editBox.focus()
    editBox.onblur = function () {
        console.log('remove', this)
        var value = this.value
        var parentNode = this.parentNode
        parentNode.removeChild(this)
        var newNode;
        if (value.includes('://')) {
            newNode = document.createElement('a')
            newNode.innerHTML = value
            newNode.href = value
            console.log(newNode)
        } else {
            newNode = document.createTextNode(value)
        }
        parentNode.appendChild(newNode)
        parentNode.onauxclick = function () {
            cellClick(this)
        }
        if (parentNode.children.length == 0) {
            parentNode.onclick = function () {
                cellClick(this)
            }
        }
        window.localStorage.setItem('linksHTML', parentNode.parentNode.parentNode.parentNode.parentNode.innerHTML)
    }
}

var calendar = document.getElementById('calendar')
calendar.innerHTML = localStorage.getItem('calendar')
var linksHTML = window.localStorage.getItem('linksHTML')
if (linksHTML && linksHTML != "undefined") {
    document.getElementById('links-div').innerHTML = linksHTML
}
var expandFlag = true;
for (var cell of Array.from(document.getElementsByTagName('input'))) {
    cell.onblur = function () {
        this.defaultValue = this.value
        var value = this.parentNode.parentNode.parentNode.parentNode.parentNode.innerHTML
        localStorage.setItem('linksHTML', value)
    }
    if (cell.id != "expand") {
        cell.onclick = function () {
            if (this.value && this.value.includes("://")) {
                if (window.event.ctrlKey) {
                    window.open(this.value, "_blank")
                } else {
                    window.location.replace(this.value)
                }
            }
        }
    }
}
var expand = document.getElementById('expand')
if (expand) {
    expand.onclick = function () {
        Array.from(document.querySelectorAll('details')).forEach(el => el.open = expandFlag)
        expandFlag = !expandFlag;
        cell.value = expandFlag ? "Expand All" : "Collapse All"
    }
}
var hr = document.getElementsByTagName('hr')[1]
if (hr) {
    calendar.scrollTop = hr.offsetTop - calendar.offsetTop + 3
}

if (true || !localStorage.getItem('calendarDate') || new Date() - new Date(localStorage.getItem('calendarDate')) > 60 * 1000) {
    chrome.identity.getAuthToken({ interactive: false }, function (token) {
        let init = { method: 'GET', async: true, headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, 'contentType': 'json' };
        Promise.all([
            fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', init).then((response) => response.json()),
            fetch('https://mvla.instructure.com/api/v1/courses').then(res => res.text()).then(res => res.replace('while(1);', '')).then(res => JSON.parse(res)),
        ])
            .then(function (data) {
                var today = new Date(new Date().setHours(0, 0, 0, 0))
                var month = new Date(today)
                var tommorow = new Date(today)
                month.setMonth(month.getMonth() + 2)
                tommorow.setDate(tommorow.getDate() + 1)
                var urls = []
                if (data[0].items) {
                    data[0].items = data[0].items.filter(x => x.summaryOverride != "Canvas" && (x.summary != "Weekend" || getStart(x).getTime() <= tommorow.getTime()))
                    urls=urls.concat(data[0].items.map(calendar_data => fetch('https://www.googleapis.com/calendar/v3/calendars/' + encodeURIComponent(calendar_data.id) + '/events?orderBy=startTime&singleEvents=true&timeMin=' + ISODateString(today) + '&timeMax=' + ISODateString(month), init).then(res => res.json()).then(res => res.items)))
                }
                if (!data[1].errors) {
                    urls = urls.concat(data[1].map(course_data => fetch('https://mvla.instructure.com/api/v1/courses/' + course_data.id + '/assignments?bucket=future&order_by=due_at').then(res => res.text()).then(res => JSON.parse(res.toString().replace('while(1);', '')))))
                } else {
                    document.getElementById('message').innerHTML+='<p><b><a href="https://mvla.instructure.com/login/google">Please Login to Canvas</a></b></p>'
                }
                if (urls) {
                    Promise.all(urls)
                        .then(arrays => [].concat.apply([], arrays))
                        .then(events => {
                            events = events.filter(a => a && getDate(getStart(a)).getTime() >= today.getTime()).sort((a, b) => getDate(getStart(a)).getTime() - getDate(getStart(b)).getTime())
                            var biggerWrapper = document.createElement('div')
                            for (var i = 0; i < events.length; i++) {
                                var event = events[i]
                                if (event) {
                                    var wrapper = document.createElement('div')
                                    wrapper.classList.add('event')
                                    var details = document.createElement('details')
                                    var breakline = document.createElement('br')
                                    var summary = document.createElement('summary')
                                    var summarylink = document.createElement('a')
                                    var hr = false;
                                    var startobj = getStart(event)
                                    var endobj = getEnd(event)
                                    if (getLink(event)) {
                                        summary.classList.add('link')
                                        summarylink.href = getLink(event)
                                    }
                                    if (startobj && endobj) {
                                        var start = getDate(startobj)
                                        var end = getDate(endobj)
                                        if (events[i + 1] && getStart(events[i + 1])) {
                                            var next = getDate(getStart(events[i + 1]))
                                            var now = new Date()
                                            if (next && next > now && start < now) {
                                                hr = document.createElement('hr')
                                            }
                                        }
                                        var daterange = formatDate(start, end)
                                        var cell = document.createElement('div');
                                        cell.classList.add('date-range')
                                        cell.innerHTML = daterange;
                                        summarylink.appendChild(cell);
                                    }
                                    var eventname = event.summary || event.name
                                    if (eventname) {
                                        var cell = document.createElement('div');
                                        cell.classList.add('summary')
                                        cell.innerHTML = eventname;
                                        summarylink.appendChild(cell);
                                    }
                                    if (event.description) {
                                        summary.appendChild(summarylink);
                                        summary.appendChild(breakline);
                                        details.appendChild(summary);
                                        div = document.createElement('div')
                                        div.classList.add('description')
                                        div.innerHTML = event.description.trim().replace(/(?:\r\n|\r|\n)+/g, "<br>").replace(/\[(.*?)\] \((.*?)\)/g, '<a href="$2">$1</a>')
                                        Array.from(div.childNodes).filter((x) => x.innerText == '\xa0').forEach(x => x.remove())
                                        details.appendChild(div)
                                        wrapper.appendChild(details);
                                    } else {
                                        summarylink.appendChild(breakline);
                                        wrapper.appendChild(summarylink);
                                        wrapper.classList.add('no-details')
                                    }
                                    biggerWrapper.appendChild(wrapper)
                                    if (hr) {
                                        biggerWrapper.appendChild(hr)
                                    }
                                }
                            }
                            while (calendar.firstChild) {
                                calendar.removeChild(calendar.firstChild)
                            }
                            calendar.appendChild(biggerWrapper)
                            calendar.innerHTML = '<div id="message"><input type="button" style="font-weight:bold" id="expand" value="Expand All"></div><hr>' + calendar.innerHTML
                            document.getElementById('expand').onclick = function () {
                                Array.from(document.querySelectorAll('details')).forEach(el => el.open = expandFlag)
                                expandFlag = !expandFlag;
                                cell.value = expandFlag ? "Expand All" : "Collapse All"
                            }
                            localStorage.setItem('calendar', calendar.innerHTML)
                            localStorage.setItem('calendarDate', (new Date()).toString())
                            hr = document.getElementsByTagName('hr')[1]
                            if (hr) {
                                calendar.scrollTop = hr.offsetTop - calendar.offsetTop + 3
                            }
                        })
                }
            });
    });
}