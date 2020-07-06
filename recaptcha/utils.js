/**
 * LICENSE NOTICE
 * 
 * This code adapted from https://github.com/pbojinov/request-ip
 * Copyright (c) 2018 Petar Bojinov - petarbojinov@gmail.com
 * 
 */

const is = require('is_js');

/**
 * Parse x-forwarded-for headers.
 *
 * @param {string} value - The value to be parsed.
 * @return {string|null} First known IP address, if any.
 */
function getClientIpFromXForwardedFor(value) {
    if (!is.existy(value)) {
        return null;
    }

    if (is.not.string(value)) {
        throw new TypeError(`Expected a string, got "${typeof value}"`);
    }

    // x-forwarded-for may return multiple IP addresses in the format:
    // "client IP, proxy 1 IP, proxy 2 IP"
    // Therefore, the right-most IP address is the IP address of the most recent proxy
    // and the left-most IP address is the IP address of the originating client.
    // source: http://docs.aws.amazon.com/elasticloadbalancing/latest/classic/x-forwarded-headers.html
    // Azure Web App's also adds a port for some reason, so we'll only use the first part (the IP)
    const forwardedIps = value.split(',').map((e) => {
        const ip = e.trim();
        if (ip.includes(':')) {
            const splitted = ip.split(':');
            // make sure we only use this if it's ipv4 (ip:port)
            if (splitted.length === 2) {
                return splitted[0];
            }
        }
        return ip;
    });

    // Sometimes IP addresses in this header can be 'unknown' (http://stackoverflow.com/a/11285650).
    // Therefore taking the left-most IP address that is not unknown
    // A Squid configuration directive can also set the value to "unknown" (http://www.squid-cache.org/Doc/config/forwarded_for/)
    return forwardedIps.find(is.ip);
}

/**
 * Determine client IP address.
 *
 * @param event
 * @returns {string} ip - The IP address if known, defaulting to empty string if unknown.
 */
function getClientIp(event) {

    // Server is probably behind a proxy.
    if (event.headers) {

        // Standard headers used by Amazon EC2, Heroku, and others.
        if (is.ip(event.headers['x-client-ip'])) {
            return event.headers['x-client-ip'];
        }

        // Load-balancers (AWS ELB) or proxies.
        const xForwardedFor = getClientIpFromXForwardedFor(event.headers['x-forwarded-for']);
        if (is.ip(xForwardedFor)) {
            return xForwardedFor;
        }

        // Cloudflare.
        // @see https://support.cloudflare.com/hc/en-us/articles/200170986-How-does-Cloudflare-handle-HTTP-Request-headers-
        // CF-Connecting-IP - applied to every request to the origin.
        if (is.ip(event.headers['cf-connecting-ip'])) {
            return event.headers['cf-connecting-ip'];
        }

        // Fastly and Firebase hosting header (When forwared to cloud function)
        if (is.ip(event.headers['fastly-client-ip'])) {
            return event.headers['fastly-client-ip'];
        }

        // Akamai and Cloudflare: True-Client-IP.
        if (is.ip(event.headers['true-client-ip'])) {
            return event.headers['true-client-ip'];
        }

        // Default nginx proxy/fcgi; alternative to x-forwarded-for, used by some proxies.
        if (is.ip(event.headers['x-real-ip'])) {
            return event.headers['x-real-ip'];
        }

        // (Rackspace LB and Riverbed's Stingray)
        // http://www.rackspace.com/knowledge_center/article/controlling-access-to-linux-cloud-sites-based-on-the-client-ip-address
        // https://splash.riverbed.com/docs/DOC-1926
        if (is.ip(event.headers['x-cluster-client-ip'])) {
            return event.headers['x-cluster-client-ip'];
        }

        if (is.ip(event.headers['x-forwarded'])) {
            return event.headers['x-forwarded'];
        }

        if (is.ip(event.headers['forwarded-for'])) {
            return event.headers['forwarded-for'];
        }

        if (is.ip(event.headers.forwarded)) {
            return event.headers.forwarded;
        }
    }


    return null;
}

module.exports = {
    getClientIpFromXForwardedFor,
    getClientIp
};