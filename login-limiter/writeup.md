# Unauthorized access: - Writeup

User may try to bruteforce passwords, possibly using a botnet. We would like to limit failed login attempts without compromising availability.

## Threats

The default implementation of NodeBB uses does not limit the amount of login requests that a user can do. The only way that it addresses this issue is by implementing a temporary account lockdown after a certain number of failed login attempts. However, there are a few issues in the way it is implemented:

* The login handler is asynchronous, so an attacker will still have more than the configured attempts, depending on how quickly all asynchronous calls are resolved, and ultimately the account locked down.

* The number of attempts and the lockdown duration, are *non-configurable* on the regular `config.json`. They instead make use of a 'meta' config file that has an effect only on build time (when the client assets are bundled).

* The login attempts counter is reset relatively quick, so a slower, non-burst bruteforce is still possible.

Not addressing login attempts and/or rate is clearly a big security issue, since a user can simply try a large amount of passwords, whether with a dictionary, combinator, or pure brute-force attack.

## Chosen countermeasures

The application has a lockdown functionality built-in, which is a good start for addressing this issue. However, we should ensure that there are no work-arounds, specifically the ones described above. We make use of Nginx to ensure the amount of requests is manageable. As an extra security measure, we also introduce a Captcha solution. It is encouraged that both are  
used in conjuction for maximal security.

### Solution 1: Nginx rate and connection limiting

Nginx's main purpose as a third-party service is the one of a load balancer. It provides a lot of flexibility in how developers can limit both the amount of requests and connections - some filter options include subpath, location, requester data, header information, and cache/memory location. In our case, we want to limit the amount of requests and connections to the location `/login` on an `IP`-basis. Below is an example configuration:

```
limit_req_zone $binary_remote_addr zone=one:10m rate=5r/m;
limit_conn_zone $binary_remote_addr zone=addr:10m;

    server {
        listen 80;
        server_name localhost;

        location / {
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_set_header Host $http_host;
            proxy_set_header X-NginX-Proxy true;

            proxy_pass http://127.0.0.1:4567;  # no trailing slash
            proxy_redirect off;

            # Socket.IO Support
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";

	        location /login {
                limit_req zone=one burst=5 nodelay;
		        limit_conn addr 2;
	            proxy_pass http://127.0.0.1:4567/login;  # no trailing slash
	        }
        }
    }
```

Basically we copy the basic configuration for a reverse-proxy, and then we make use of nested location directives to rate-limit `/login` specifically. Here we limit the endpoint to 5 requests per minute, grouped by `IP`, and to two connections per `IP` (justified as 1 connection per method, the methods being `GET` and `POST`). The problem states the issue of loging-in credentials specifically, so the config is left at that. The developers are free to add more directives, with separate caches and/or rate specifications as needed.

### Solution 2: Use of captchas

## Difficulties and considerations

Configuration is quite straightforward. An important consideration, however, is that the certificates used here were *self-signed*. This is problematic - if a certificate has no authority, or in other words, if it is not signed by trusted third-parties, it is almost not any more secure than not using `HTTPS` at all. This is because a MitM attacker can forge two pairs of certificates of his own, send them to the client and server, and act as an intermediary, allowing him to still decrypt and read all the traffic. For this toy example, however, self-signed signatures were deemed sufficient to show the idea. For a real application, the certificates would need to be signed by a trusted party - one free option is *Certbot*.