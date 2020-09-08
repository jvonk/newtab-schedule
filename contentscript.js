function waitForAddedNode(params) {
    new MutationObserver(function(mutations) {
        var xpath = decodeURIComponent(/(?<=#XPath=).*/.exec(window.location.href))
        var href = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue
        console.log(href)
        if (href) {
            this.disconnect();
            params.done(href);
        }
    }).observe(params.parent || document, {
        subtree: true,
        childList: true,
    });
}

if (window.location.href.includes("#XPath=")) {
    waitForAddedNode({
        parent: document.body,
        done: function(href) {
            val=href.value
            console.log(val)
            if (val.includes("courses/990/modules")) {
                val+="#XPath=%2F%2Fa%5Bspan%5Bcontains(text()%2C'Weekly%20Slate')%5D%5D%2F%40href"
            }
            val=val.replace('drive.google.com/file/d/','docs.google.com/document/d/')
            val=val.replace('/edit','/preview')
            val=val.replace('/view','/preview')
            console.log(val)
            window.location.assign(val)
        }
    });
}