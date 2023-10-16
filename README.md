# KTH DD2391/DD2394 - Cybersecurity Project

This is Group 12's solutions addressing the security challenges, proposed by course DD2391/DD2394. The group is supposed to solve three challenges (two selective, one mandatory) that improve the security of the full-stack web application [NodeBB](https://github.com/NodeBB/NodeBB), a NodeJS forum fullstack app generator, that supports Redis, MongoDB, or PostgreSQL.  

For all but the mandatory challenge, MongoDB is to be setup (the default database used). Redis is to be used for the mandatory one, so as to not render the challenge trivial.

## Authors

| Profile Picture | Name | Email |
|---|---|---|
| ![To5BG](https://github.com/to5bg.png?size=70) | Alperen Guncan | a.i.guncan02@gmail.com |
| ![sunnypawat](https://github.com/sunnypawat.png?size=70) | Pawat Songkhopanit | pawat@ug.kth.se |
| <img src="https://avatars.githubusercontent.com/u/34583592?v=4" alt="xFleur" width="70"/> | Melissa Julsing | julsing@kth.se |
| <img src="https://avatars.githubusercontent.com/u/112628985?v=4" alt="bktbkt1" width="70"/> | Ka Ho Kao | khkao@kth.se |

## Structure

The repository is structured as follows:
* The master branch is a direct fork of the origin NodeBB repository, with two changes
    * README.md (what you are reading right now)
    * the report, as a `pdf`
* Each issue is resolved in a separate **branch**
* Each issue's additional files are stored in a separate **folder**
* Both are specified as *Branch* and *Focus* respectively, under each problem section
* The folder for each problem contains:
    * Example/reference configuration files to be used/analyzed/built upon
    * A **writeup.md** that contains a thorough extension of the respective report problem entry, including:
        * Threats
        * Countermeasures and their justifications
        * Any needed configuration steps
        * Difficulties and considerations

## Problems
*Below are the three problems that the group solves:*

### Database leakage and corruption (Mandatory)
> Branch: leakage-db  
> Focus: leakage-db-files *folder*

The default configuration of the database and NodeBB may be insecure (see the installation notes). We would like to prevent any remote access to the database that is not mediated by NodeBB software.  

- **Bind address**

The team has utilized Redis to solve this problem. Redis provides the ability to specify the network interface or IP address for incoming access connections through the bind_address configuration option. By setting this option to 127.0.0.1 ::1, Redis restricts remote access and only allows local access, enhancing security and isolating Redis from other services or applications on the same server.

- **Authentication on the Redis server**

The team has used SHA256 and HMAC-SHA256 tp generat strong and reliable passwords, making it difficult for attackers to guess or solve.

- **Firewall for NodeBB**

By default, NodeBB runs on port 4567. We want to configure our firewall to ensure that only port 4567 is listened to. “pfctl” command line interface is utilized to interact with the packet filter firewall. The team has successfully set a limitation that only allowing matching incoming TCP packets to pass through the firewall.


### Unauthorized access
> Branch: limit-login  
> Focus: login-limiter **folder**

User may try to bruteforce passwords, possibly using a botnet. We would like to limit failed login attempts without compromising availability.  

This problem has been resolved in two ways that *should preferably be used concurrently*:

- **Rate and connection limiting**

Making use of Nginx's built-in features, one can limit both the request rate and connection establishment to the server on an IP-basis. Furthermore, the application already has a built-in functionality of temporarily locking an account after a number of failed attempts - the team has simply moved some config variables from the meta config to `config.json`.

- **Captcha**

[TODO]

## Network eavesdropping
> Branch: ssl-upgrade  
> Focus: ssl **folder**

HTTP traffic is not encrypted. We would like to use SSL to protect confidentiality of post that are submitted or accessed by the users.  

This problem has been tackled in two different ways:

- **The cleaner built-in SSL upgrade**

This one makes use of the built-in support for HTTPS/SSL server, by tweaking `config.json`. However, the developers explicitly want users to avoid this solution, hence the second option below.

- **Nginx reverse proxy**

Set up Nginx to reverse-proxy and encrypt all incoming traffic. This also has the benefit of all extra features that Nginx provides, at the cost of more iinfrastructure to be configured.

