# Network eavesdropping - Writeup

`HTTP` traffic is not encrypted. We would like to use `SSL` to protect confidentiality of post that are submitted or accessed by the users.

## Threats

The default implementation of NodeBB uses regular `HTTP` for establishing communication between the web client and server. This is not an acceptable protocol for mainstream usage across an insecure channel like the internet.   

The main reason for this is that `HTTP` does not encrypt its payloads, which leads to *personal information leakages*. In other words, a man-in-the-middle attacker can simply sniff all the traffic, and all of a sudden they have a clear look on what the client is doing. This also includes any passwords and sensitive/private information.   

As such, if we plan to deploy this application to the Internet with real users, *a secure protocol like `TLS` needs to be used*.

## Chosen countermeasures

There are two main groups of solutions that can address this issue - one is to upgrade the internal connections to use `TLS`, and the other is to pipe all the connection to a secure service, which is another way of describing a third-party reverse proxy. It would use regular `HTTP` to connect to the server, but connects to the clients with a secure protocol. The group has given one solution per category and weighted the merit of each.

> NOTE: In case the reader wants to implement these changes, it is expected that he/she has set up NodeBB and the required database by following the provided guides, prior to 
> following the solutions below! Furthermore, solutions that make use of Nginx already assume the user has downloaded the service.  
> NodeBB documentation and installation guide: https://docs.nodebb.org/installing/os/  
> Nginx installation (Linux packages): https://nginx.org/en/docs/install.html  
> Nginx installation (Windows & Linux archives): https://nginx.org/en/download.html  

### Prerequisite: Generating self-signed certificate

For the descriptions below, and for the sake of demonstration, *self-signed certificates* are used. This is by no means secure, and should **not be done if the product is intended to be publicly deployed**. However, generating trusted and signed third-party certificates is out-of-scope for this document, since most such services require your application to be publicly hosted, and for this project it is sufficient to develop the solutions locally.  

If you still want to get some trusted certificates, refer to [Certbot](https://certbot.eff.org/)'s guide to see how you can make use of their free service. Another option is to look into premium services that provide extra features and guarantees, one example being [Cloudflare](https://www.cloudflare.com/application-services/products/ssl/), which also has a free option if you publicly host your application on their service.

For this problem, we use this command to generate a self-signed certificate:
```shell
openssl req -newkey rsa:4096 -nodes -keyout key.pem -x509 -sha256 -days 365 -out certificate.pem
```

This creates a non-interactive (`-nodes`), `RSA` encrypted with 4096-bit strength (`rsa:4096`) certificate *and* its key, with 1-year expiry (`-days 365`). For simplicity and isolation the generated files are stored in the same directory as the one where Nginx's configuration is (`~nginx/conf`).


### Option 1: The cleaner built-in SSL upgrade

NodeBB uses `Express.js` for middleware and the bundled *http* and *https* `NodeJS` modules for starting up the server. As such, given that the source code is properly engineered, all it takes is to ensure an https server is initiated. After analyzing the source code, one can see that the application attempts to read the key-value pair `ssl` in `config.json`, and if it finds it, it will boot with an https server.

0. Generate the self-signed certificate, if none.

1. Open the `config.json` in the NodeBB directory.

2. Add the following key-value pair to the configuration
    ```json
    "ssl": {
        "key": "<KEY-PATH>",
        "cert": "<CERTIFICATE-PATH>"
    }
    ```
    where `<KEY-PATH>` and `<CERTIFICATE-PATH>` are the absolute paths to the certificate credentials to be used for `TLS`.

3. Update "url" to use `https` and change its port to `443`.

4. Change "port" to `443`.

5. Run NodeBB with `nodebb start`. If NodeBB was running, restart the service - most easily done by `nodebb restart` in the background `cmd` process.

An example configuration for this solution is given as file `example_config_ssl.json`.

This solution is much cleaner and requires no extra infrastructure, and therefore less attack surface. Yet, the developers of NodeBB do not recommend this solution, and opt for client developers to use a proxy instead. The reason for this is unclear - not justified in the project’s `README` either. The group’s guess is that the application does not have built-in support for features deemed beneficial, that a proxy like `Nginx` can provide.

### Option 2: Nginx reverse proxy

A simple, ubiquitous service that is being used for reverse-proxying is `Nginx`. We run the application with its default configuration (`http`, port `4567`), and then setup `Nginx` to reverse-proxy from server to port `443`. Below is an example configuration:

0. Generate the self-signed certificate, if none.

1. Keep the default `config.json` that NodeBB generates at setup. An example configuration for this solution is given as file `example_config_http.json`.

2. Edit the used Nginx configuration. In the writer's case this was `~nginx/conf/nginx.conf`. Do so by replacing the `server` directive with:

    ``` 
    server {
            listen                   80 http2;
            server_name       localhost;

            return                 302 https://$server_name$request_uri;
    }
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

    where `<CERTIFICATE>` and `<KEY>` are the respective filenames (and paths if not in the same directory). The first server directive simply acts as a safeguard that redirects all traffic on port `80` to `443`, and as such it is optional. An example configuration for Nginx is given as file `example_nginx.conf`.

3. Run the Nginx service.

    ```shell
    sudo systemctl start nginx.service
    ``` 
    on Linux, or simply run the `nginx.exe` file on Windows. Alternatively, reload the service with 
    ```shell
    nginx -s reload
    ``` 
    if it is already running.

4. Run NodeBB with `nodebb start`. If NodeBB was running, restart the service - most easily done by `nodebb restart` in the background `cmd` process.

5. **(Optional)** As it is right now, both the proxy and the server can be accessed separately. This is because both ports are still running (original service and the reverse-proxy). While this is unavoidable, it is possible that we block all non-local traffic towards the NodeBB server port. This makes sure that remote clients can access the web server only through the proxy, by extension only through `HTTPS`.

    We achieve this by editing the firewall configuration:

    Linux:  
    ```shell
    /sbin/iptables -A INPUT -p tcp --destination-port 4567 -j DROP \\
    /sbin/iptables -A INPUT -p udp --destination-port 4567 -j DROP
    ```
    Windows:  
    1. Go to `Windows Firewall > Advanced settings > Inbound rules`.
    2. On the right, click on `New Rule...`  
    3. Select `Port` rule, and pick the following options:
        1. TCP
        2. Specific local ports: 4567
        3. Block the connection
        5. All profiles set
        6. Any name and description you desire
    4. Repeat rule for UDP protocol
    
    &nbsp;  
    We basically try to block all inbound traffic to port `4567` through the firewall, leaving only the local network to have access to it. If the server and developers are on separate networks, for ease of development it is recommended that one adds an exception to the firewall rules, by simply opening port `4567` only to specific `IP` addresses, namely the ones of the developer team's network[s].

It is quite clear that this solution requires much more configuration, and requires that the developers also have `Nginx` running. Conversely, the presence of more infrastructure could introduce more vulnerabilities to hackers, especially sniffers on the proxy service. However, this solution moves all the load balancing and traffic encryption away from the application, and into a third-party trusted service, which also comes with additional neat features. Not to mention that Nginx can resolve more than one of the problems that are resolved by the group, making the use of Nginx more viable in general.

## Difficulties and considerations

Configuration is quite straightforward. An important consideration, however, is that the certificates used here were *self-signed*. This is problematic - if a certificate has no authority, or in other words, if it is not signed by trusted third-parties, it is almost not any more secure than not using `HTTPS` at all. This is because a MitM attacker can forge two pairs of certificates of his own, send them to the client and server, and act as an intermediary, allowing him to still decrypt and read all the traffic. The browser alerts the client if the accessed website has untrusted certificates, so with trusted certificates a client can tell between the genuine website and someone trying to 1. redirect the user's traffic to a malicious 'copy' of the website, or 2. a hacker that tries to act as an intermediary. For this toy example, however, self-signed signatures were deemed sufficient to show the general idea, knowing the challenges of issuing regular trusted ones. For a real application, the certificates would need to be signed by a trusted party - one free option is *Certbot*, or *Google*/*Cloudflare* for some premium options.