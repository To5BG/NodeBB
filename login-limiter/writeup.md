# Unauthorized access - Writeup

User may try to bruteforce passwords, possibly using a botnet. We would like to limit failed login attempts without compromising availability.

## Threats

The default implementation of NodeBB uses does not limit the amount of login requests that a user can do. The only way that it addresses this issue is by implementing a temporary account lockdown after a certain number of failed login attempts. However, there are a few issues in the way it is implemented:

* The login handler is asynchronous, so an attacker will still have more than the configured attempts, depending on how quickly all asynchronous calls are resolved, and ultimately the account locked down.

* The number of attempts and the lockdown duration, are *non-configurable* on the regular `config.json`. They instead make use of a 'meta' config file that has an effect only on build time (when the client assets are bundled).

* The login attempts counter is reset relatively quick, so a slower, non-burst bruteforce is still possible.

Not addressing login attempts and/or rate is clearly a big security issue, since a user can simply try a large amount of passwords, whether with a dictionary, combinator, or pure brute-force attack, to *gain access to accounts he is not supposed to have access to*. Such an attack has the additional complexity that it can congest the network of the server, slowing down all other processes, including ones that are supposed to prevent such an issue! This is why our solution makes use of a third party service whose operation is decoupled from the server's.

## Chosen countermeasures

The application has a lockdown functionality built-in, which is a good start for addressing this issue. However, we should ensure that there are no work-arounds, specifically the ones described above. We make use of Nginx to ensure the amount of requests is manageable. As an extra security measure, we also introduce a Captcha solution. It is encouraged that both are used in conjuction for maximal security.

> NOTE: In case the reader wants to implement these changes, it is expected that he/she has set up NodeBB and the required database by following the provided guides, prior to following the solutions below! Furthermore, solutions that make use of Nginx already assume the user has downloaded the service.  
> NodeBB documentation and installation guide: https://docs.nodebb.org/installing/os/  
> Nginx installation (Linux packages): https://nginx.org/en/docs/install.html  
> Nginx installation (Windows & Linux archives): https://nginx.org/en/download.html  

> NOTE: The below solutions alter the client source code. Therefore, if the reader branched off here *after* configuring NodeBB, the client code needs to be rebundled in order for these changes to take effect. This can be done as simply as `nodebb build`, followed by `nodebb restart/start`. It is also advised that the client assets are rebundled after switching to another branch.  

> NOTE: The captcha solution was deemed most viable when self-hosted, for maximal security. Therefore, if the reader wants to implement this feature, a PHP web server with the GD extension will be required. The user is expected to have PHP >= 5.6 downloaded.
> PHP download page: https://www.php.net/downloads

### Solution 1: Nginx rate and connection limiting

Nginx's main purpose as a third-party service is the one of a load balancer. It provides a lot of flexibility in how developers can limit both the amount of requests and connections - some filter options include subpath, location, requester data, header information, and cache/memory location. In our case, we want to limit the amount of requests and connections to the location `/login` on an `IP`-basis. Below is an example configuration:

1. This solution moves two previously hard-coded values to ones that are configurable in the main `config.json` of the application. Namely, `loginLockoutAttempts` and `loginLockoutDuration`, aptly named for what the are supposed to affect. Only important note is that both variables are numbers, and the latter is the duration in *minutes*. However, both of these are optional, and they are defaulted to 5 if missing from the config. At the end, it is up to the user whether he wants to change them depending on what he deems reasonable. The group has provided an example config that would set new custom values, as file `example-config.json`.

2. Edit the used Nginx configuration. In the writer's case this was `~nginx/conf/nginx.conf`. Do so by replacing the `server` directive with:  

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
    An example configuration for Nginx that can be used to implement both this and next feature is given as file `example_nginx.conf`.

Basically we copy the basic configuration for a reverse-proxy, and then we make use of nested location directives to rate-limit `/login` specifically. Here we limit the endpoint to 5 requests per minute, grouped by `IP`, and to two connections per `IP` (justified as 1 connection per method, the methods being `GET` and `POST`). The problem states the issue of loging-in credentials specifically, so the config is left at that. The developers are free to add more directives, with separate caches and/or rate specifications as needed.

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

### Solution 2: Use of captchas

Restricting traffic to the server, when accompanied with the account lockdown functionality, is often enough to handle most flavors of bruteforce attacks. However, in a situation where the botnets are quite sophisticated in taking great care in their attempts, or if the overall capacity of the server is small comparatively to what the botnets can hoard, rate limiting may not be a sufficient solution. As such, the team also took their time to implement a solution that makes use of **Captchas**. The idea here is not to completely remove bots from the question - any hacker with sufficient interest can program the logic to bypass any captcha - but it is moreso to further slow down the logon process for attackers. An appropriately made Captcha would be **server-side verified**, preferably even in a *separate server* to decouple the roles and traffic of the two applications. We do not want a hacker to simply be able to bypass a captcha entirely.

The most commonly used captcha service is, as of now, Google's reCaptcha, due to the ease of implementation, maximal security, and huge variety in types. The problem here, however, is the same as with the certificates in ["Network eavesdropping"](https://github.com/To5BG/NodeBB/blob/ssl-upgrade/ssl/writeup.md#network-eavesdropping---writeup) - either it is a paid service, or requires that the server is publicly hosted. For a self-hosted option, after extensive research on the options, we have stumbled upon IconCaptcha: https://github.com/fabianwennink/IconCaptcha-PHP.  
It is the closest, viable solution to what the team wants to achieve - a self-hosted, open-source captcha that is simple for humans to do. It also comes with **CSRF tokenization**, value **honeypots**, time **tracking**, and a **large permutational** variety.  

This is by far the longest and most laborious configuration, but it is definitely worth the time!

0. For this solution you will need Nginx and `PHP` installed, refer to the leftout note above.  

1. Again, we keep the NodeBB config intact.

2. Edit the used Nginx configuration. In the writer's case this was `~nginx/conf/nginx.conf`. Do so by replacing the `server` directive with:  

    ```
    server {
        listen 80;
        server_name localhost;

	    location /validateCaptcha {
	        proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_set_header Host $http_host;
            proxy_set_header X-NginX-Proxy true;

            proxy_pass http://127.0.0.1:8000/captcha-request.php;
            proxy_redirect off;
        }

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
        }
    }
    ```
    An example configuration for Nginx that can be used to implement both this and previous feature is given as file `example_nginx.conf`.

    Do note the difference in one of the locations, namely the endpoint `/validateCaptcha`. This will be the endpoint that our application will use to communicate with the Captcha server for fetching and validation. While the path is mandatory (`/captcha-request.php`), you are free to change the port to your own liking. Preferably if this application was deployed publicly it would not even share the same domain with the captcha server for security purposes, but for this problem a local network is sufficient.  

3. Now it is time to boot up the `PHP` server. The repository already comes with all assets needed to host a captcha server! All you need to do is open a command prompt of choice, navigate to the folder that contains the source PHP files (`~login-limiter/captcha/src`), and start the web server with
    ```shell
    php -S 127.0.0.1:8000
    ```  
    Make sure the host and ports match with your Nginx configuration. Finally, make sure your `PHP` server has `GD` started as well - this is the extension that the server uses to manipulate the icons for the captcha. The page https://stackoverflow.com/questions/2283199/enabling-installing-gd-extension-without-gd pretty much covers all possible ways to do this - the short version is that you either have to enable the plugin when downloading PHP, or edit the PHP.ini config file (or if none, enable one of the template files first).  

4. Configure the captchas as you would like! The team has settled on 5-8 images, 5 attempts per page load, with 1 minute invalidation time. The two places where one can play with the configurations are on the [client's login script](https://github.com/To5BG/NodeBB/blob/dccef676b21d17e15485ebce02ec0c78118ef9eb/public/src/client/login.js#L15), and on the [server's class file](https://github.com/To5BG/NodeBB/blob/dccef676b21d17e15485ebce02ec0c78118ef9eb/login-limiter/captcha/src/captcha.class.php#L46).  

5. Run the Nginx service.

    ```shell
    sudo systemctl start nginx.service
    ``` 
    on Linux, or simply run the `nginx.exe` file on Windows. Alternatively, reload the service with 
    ```shell
    nginx -s reload
    ``` 
    if it is already running.

6. Run NodeBB with `nodebb start`. If NodeBB was running, restart the service - most easily done by `nodebb restart` in the background `cmd` process. 

Now the login form will have an icon captcha that *needs* to be verified before submitting the form. This one in particular is about choosing the least recurrent icon over a set of several icons, with the added difficulty that icons are rotated, flipped, and shuffled randomly. *The more technically-inclined individuals are encouraged to go over the Git history to appreciate all the code integration and configuration needed to have this problem solved!*

## Difficulties and considerations

Configuration is quite straightforward for this problem as well. However, there were some difficulties after setting up Nginx that took a bit to account for. For one, Nginx throws a `503` error when its request queue is filled, however, the NodeBB client did not have a way of handling such error codes. The team had to simply adjust the client code slightly, by introducing a new error flow, with an accompanying message, which in our case was `You are making too many requests.`

One future considerations for developers extending the pool of locations that should be under rate limits - it is preferable if the location list is extended with a regex or an `OR` directive than it is to duplicate the location directive already present. This is due to both brevity and performance reasons.

As to the captchas, while not difficult in terms of technical skill, it was by far the most time consuming problem of the project, partly due to being the most ambitious of the bunch. There is, however, one important consideration - while the captcha si verified server-side, it's interaction with the form input *is not*. In an ideal scenario, the form will include all the fields of the captcha, and once sent the server will make an additional request to the other server to verify the captcha first, and just after will the information be rendered. However, due to the time constraints of the project, as well as the inhibitive structure of NodeBB, it is quite difficult to extend the controllers with all this business logic. An attempt has been made to integrate a third-party http fetch library like *Axios*, but the links would break, or the proxy would complain.  

After a lot of headscratching, the developers of this solution thought of a solution that is *semi-secure*. In short, after the server verifies the captcha, it triggers a new element to be appended into the document that will handle all the form information properly. Soon after it completes its task (of disabling the form or letting it go through if the captcha is valid), the element will self-destroy itself from the DOM. The idea is that in this way the attacker would not have time to alter its behavior, or make the forms unblocked. This solution, however, is still only semi-secure, as a good attacker can intercept and slow down the element payload and make use of that time to bruteforce the form without Captcha verification. As such, in its current implementation, it is advised that this solution is implemented in conjuction to the rate-limiting, to alleviate this danger. Furthermore, the captcha never had the intent of completely hindering bots, because it *cannot by design*, but to slow down a bruteforce attack - and manually intercepting responses slows down the attack considerably enough that a captcha does perform its task tactically.