# Network eavesdropping - Writeup

`HTTP` traffic is not encrypted. We would like to use `SSL` to protect confidentiality of post that are submitted or accessed by the users.

## Threats

The default implementation of NodeBB uses regular `HTTP` for establishing communication between the web client and server. This is not an acceptable protocol for mainstream usage across an insecure channel like the internet.   

The main reason for this is that `HTTP` does not encrypt its payloads, which leads to *personal information leakages*. In other words, a man-in-the-middle attacker can simply sniff all the traffic, and all of a sudden they have a clear look on what the client is doing. This also includes any passwords and sensitive/private information.   

As such, if we plan to deploy this application to the Internet with real users, *a secure protocol like `TLS` needs to be used*.

## Chosen countermeasures

There are two main groups of solutions that can address this issue - one is to upgrade the internal connections to use `TLS`, and the other is to pipe all the connection to a secure service, which is another way of describing a third-party reverse proxy. It would use regular `HTTP` to connect to the server, but connects to the clients with a secure protocol. The group has given one solution per category and weighted the merit of each. For the descriptions below, and for the sake of demonstration, *self-signed certificates* are used. This is addressed below.

### Option 1: The cleaner built-in SSL upgrade

NodeBB uses `Express.js` for middleware and the bundled *http* and *https* `NodeJS` modules for starting up the server. As such, given that the source code is properly engineered, all it takes is to ensure an https server is initiated. After analyzing the source code, one can see that the application attempts to read the key-value pair `ssl` in `config.json`, and if it finds it, it will boot with an https server. Therefore, the solution only requires that the user adds in the config

```json
"ssl": {
     "key": "<KEY-PATH>",
     "cert": "<CERTIFICATE-PATH>"
}
```

This solution is much cleaner and requires no extra infrastructure, and therefore less attack surface. Yet, the developers of NodeBB do not recommend this solution, and opt for client developers to use a proxy instead. The reason for this is unclear - not justified in the project’s `README` either. The group’s guess is that the application does not have built-in support for features deemed beneficial, that a proxy like `Nginx` can provide.

### Option 2: Nginx reverse proxy

A simple, ubiquitous service that is being used for reverse-proxying is `Nginx`. We run the application with its default configuration (`http`, port `4567`), and then setup `Nginx` to reverse-proxy from server to port 443. Below is an example configuration:

``` 
server: {
    listen                        443 ssl;
    server_name            localhost;
    ssl_certificate          <CERTIFICATE>.pem;
    ssl_certificate_key  <KEY>.pem;
    ssl_protocols           TLSv1 TLSv1.1 TLSv1.2 TLSv1.3;
    ssl_ciphers              HIGH:!aNULL:!MD5;
    location / {
        proxy_set_header     X-Real-IP $remote_addr;
        proxy_set_header     X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header     X-Forwarded-Proto $scheme;
        proxy_set_header     Host $http_host;
        proxy_set_header     X-NginX-Proxy true;
        proxy_pass               http://127.0.0.1:4567;
        proxy_redirect          off;
        # Socket.IO Support
        proxy_http_version  1.1;
        proxy_set_header     Upgrade $http_upgrade;
        proxy_set_header     Connection “upgrade”;
    }     
}
```

Furthermore, to maximize security, one has to configure his/her own ipconfig table to block all non-local traffic towards the NodeBB server. This makes sure that clients can access the web server only through the proxy, by extension only through `HTTPS`.

It is quite clear that this solution requires much more configuration, and requires that the developers also have `Nginx` running. Conversely, the presence of more infrastructure could introduce more vulnerabilities to hackers, especially sniffers on the proxy service. However, this solution moves all the load balancing and traffic encryption away from the application, and into a third-party trusted service, which also comes with additional neat features.

## Difficulties and considerations

Configuration is quite straightforward. An important consideration, however, is that the certificates used here were *self-signed*. This is problematic - if a certificate has no authority, or in other words, if it is not signed by trusted third-parties, it is almost not any more secure than not using `HTTPS` at all. This is because a MitM attacker can forge two pairs of certificates of his own, send them to the client and server, and act as an intermediary, allowing him to still decrypt and read all the traffic. For this toy example, however, self-signed signatures were deemed sufficient to show the idea. For a real application, the certificates would need to be signed by a trusted party - one free option is *Certbot*.