# KTH DD2391/DD2395 - Cybersecurity Project

This is Group 12's solutions addressing the security challenges, proposed by course DD2391/DD2395. The group is supposed to solve three challenges (two selective, one mandatory) that improve the security of the full-stack web application [NodeBB](https://github.com/NodeBB/NodeBB), a NodeJS forum fullstack app generator, that supports Redis, MongoDB, or PostgreSQL.  

For all but the mandatory challenge, MongoDB is to be setup for all but the first challenge, where Redis is to be used to not render the challenge trivial.

## Authors

| Profile Picture | Name | Email |
|---|---|---|
| ![To5BG](https://github.com/to5bg.png?size=70) | Alperen Guncan | a.i.guncan02@gmail.com |
| ![sunnypawat](https://github.com/sunnypawat.png?size=70) | Pawat Songkhopanit | pawat@ug.kth.se |
| <img src="https://avatars.githubusercontent.com/u/34583592?v=4" alt="xFleur" width="70"/> | Melissa Julsing | julsing@kth.se |
| <img src="https://avatars.githubusercontent.com/u/112628985?v=4" alt="bktbkt1" width="70"/> | Ka Ho Kao | khkao@kth.se |

## Problems
*Below are the three problems that the group tries to solve:*
### Database leakage and corruption (Mandatory)
The default configuration of the database and NodeBB may be insecure (see the installation notes). We would like to prevent any remote access to the database that is not mediated by NodeBB software.  
[TODO]
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


