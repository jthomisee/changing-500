function handler(event) {
    var request = event.request;
    var headers = request.headers;
    var host = headers.host.value;
    
    // Check if request is coming from old domain
    if (host === 'dealinholden.com' || host === 'www.dealinholden.com') {
        // Construct new URL with changing500.com domain
        var newUrl = 'https://changing500.com' + request.uri;
        
        // Add query string if present
        if (request.querystring && Object.keys(request.querystring).length > 0) {
            var queryParams = [];
            for (var param in request.querystring) {
                var paramValue = request.querystring[param].value;
                queryParams.push(param + '=' + encodeURIComponent(paramValue));
            }
            newUrl += '?' + queryParams.join('&');
        }
        
        // Return 301 permanent redirect
        var response = {
            statusCode: 301,
            statusDescription: 'Moved Permanently',
            headers: {
                'location': { value: newUrl },
                'cache-control': { value: 'max-age=31536000' } // Cache redirect for 1 year
            }
        };
        
        return response;
    }
    
    // For changing500.com requests, continue normally
    return request;
}
