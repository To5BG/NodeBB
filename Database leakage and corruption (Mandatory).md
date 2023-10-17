# Database leakage and corruption (Mandatory)

The default configuration of the database and NodeBB may be insecure. We would like to prevent any remote access to the database that is not mediated by NodeBB software.

## Threats
By default, if no "bind" configuration directive is specified, Redis listens for connections from all available network interfaces on the host machine. This means that Redis is configured to accept connections from any IP address and any network interface on the system. While this configuration provides flexibility for clients to connect to Redis from different sources, it can pose security risks such as unauthorized access, data exposure, and injection attacks. 

In addition, by default, the Redis server does not have an authentication set up, which may lead to every comment being executed without any verification. Therefore, it does not allow you to manage a system with roles and track events. An impactful threat is, for example, that an evil user could modify or delete the database with one comment. With no authentication, it is also not possible to take track of who is doing what to the server. 

Another threat is that NodeBB itself does not have a built-in firewall. A firewall is a network security device or software that monitors and controls incoming and outgoing network packages based on predetermined security rules. It acts as an agent between two networks. Without having a firewall, the server is vulnerable for example unauthorized access and DDoS attacks.

## Chosen countermeasures
### Solution 1: Redis restrictive Configuration
Considering the risks posed by the default configuration of Redis, this solution primarily focuses on modifying the Redis configuration to improve network security. In this solution, redis.conf file will be modified.
#### Bind address
In Redis, it is possible to specify the network interface or IP address for incoming access connections. By configuring the bind_address setting, we can control which network interfaces or IP addresses are permitted to connect to our Redis server. This configuration restricts remote access to the network and only allows connections from the local machine. It also helps to isolate Redis from other services or applications running on the same server. By setting bind_address to 127.0.0.1 and ::1, the Redis server will exclusively allow access from the local machine.

*Detailed procedures:*
1. Open the Redis configuration file
2. Under the bind configuration directive, add the following code:
```bind 127.0.0.1 ::1```
This is to allow access only form the local machine
3. Save and close the file
4. Restart the redis server by typing the following command line in the terminal
```redis-server /path/to/redis.conf```
5. Confirm Redis is now listening only on the local machine by using the following command line
```Redis-cli```
If the Redis server is properly configured, you should be able to connect without any issues.

#### Authentication on the Redis server
When the requirepass or password setting is enabled in Redis, the server will reject any queries from unauthenticated clients. Redis offers an Access Control List (ACL) system that allows fine-grained control over privileges and permissions for both the redis-server and redis-cli. By using the ACL genpass command, we can generate a strong and reliable password. The password is generated using SHA256 and HMAC-SHA256 algorithms, ensuring its randomness and security. The resulting password consists of 256 bits (64 hex characters), making it difficult for attackers to guess or crack.

*Detailed procedures:*
1. Start the redis server and type the redis-cli command
2. Generate a password by typing the following command
```ACL GENPASS```
3. Copy the password and use the following command to set the requirepass parameter in Redis
```config set requirepass [randompassword]```
4. Restart the redis server
5. Test the configuration by using some redis commands, like "FLUSHALL". If worked, an authentication error```(error)NOAUTH Authentication required``` is displayed if no password is entered
6. Type ```auth [password]``` to enter password, if the password is corrected, ```OK``` will be displayed and further redis commands can be used

## Solution 2: FireWall
By default, NodeBB runs on port 4567. We want to configure our firewall to ensure that only port 4567 is listened to. We configured a software firewall at the location where the server is hosted, to control traffic to and from the NodeBB. Since the NodeBB was running on MacOS we used “pfctl” which is a command-line interface for managing and interacting with the Packet Filter (PF) firewall. 
Detailed procedures are as followed:
1. Create the redis.pf file and added the configuration line
```rdr pass inet proto tcp from any to any port -> 127.0.0.1 port 4567```
######  *have to leave a blank line after that.
2. Load the PF firewall rules using pfctl by typing the following command line in the terminal
```sudo pfctl -f /path/to/redis.pf```
3. Enable PF firewall
```sudo pfctl -e```
4. To check if the firewall rules are loaded correctly, run the following:
```sudo pfctl -s rules```

With this rule, only matching incoming TCP (Transmission Control Protocol) packets on the internal interface are allowed to be passed (pass) through the firewall. When going to any other port besides http://localhost:4567/ the website won't be accessible. When we used a different port such as port 80, we noticed that unlike before, the website was now also not visible in the browser.


## Difficulties
The authentication service for the Redis server is not secure enough. It currently relies on a single password for all users, which is not ideal. To enhance the security, we need to implement an authentication service that has multiple users and bind the actions of those users to the logging services or give users different privileges for optimal security instead.

A further improvement to consider in the future is configuring the `bind address` or firewall settings in alignment with our actual application setup. For example, we need to set the bind address to the real address we use to host our server. We also need to take into account the specific firewall configuration for the device on which we host the server.




