# KTH DD2391/DD2395 - Cybersecurity Project

This is Group 12's solutions addressing the security challenges, proposed by course DD2391/DD2395. The group is supposed to solve three challenges (two selective, one mandatory) that improve the security of the full-stack web application [NodeBB](https://github.com/NodeBB/NodeBB), a NodeJS forum fullstack app generator, that supports Redis, MongoDB, or PostgreSQL databases.  

For all but the mandatory challenge, MongoDB is to be setup. Redis is to be used for that one as to not render the challenge trivial.

## Authors

| Profile Picture | Name | Email |
|---|---|---|
| ![To5BG](https://github.com/to5bg.png?size=70) | Alperen Guncan | a.i.guncan02@gmail.com |
| ![sunnypawat](https://github.com/sunnypawat.png?size=70) | Pawat Songkhopanit | pawat@ug.kth.se |
| <img src="https://avatars.githubusercontent.com/u/34583592?v=4" alt="xFleur" width="70"/> | Melissa Julsing | julsing@kth.se |
| <img src="https://avatars.githubusercontent.com/u/112628985?v=4" alt="bktbkt1" width="70"/> | Ka Ho Kao | khkao@kth.se |

## Problems

Each problem will be addressed on a separate branch, with an accompanying `md` file to explain any configuration steps, future considerations, and/or justifications for solving this solution in the way it was.  
*Below are the three problems that the group tries to solve:*

### Database leakage and corruption (Mandatory)

The default configuration of the database and NodeBB may be insecure (see the installation notes). We would like to prevent any remote access to the database that is not mediated by NodeBB software.  
***[TODO]***

### Unauthorized access

User may try to bruteforce passwords, possibly using a botnet. We would like to limit failed login attempts without compromising availability.  
***[TODO]***

### Network eavesdropping

> Branch: ssl-upgrade  
> Focus: ssl **folder**

HTTP traffic is not encrypted. We would like to use SSL to protect confidentiality of post that are submitted or accessed by the users.  

This problem has been tackled in two different ways:

- **The cleaner built-in SSL upgrade**

This one makes use of the built-in support for HTTPS/SSL server, by tweaking `config.json`. However, the developers [explicitly](https://github.com/NodeBB/NodeBB/blob/0acb2fcfe472cb745618e806e41af3e551580fad/src/webserver.js#L271C1-L271C95) want users to avoid this solution, hence the second option below.

- **Nginx reverse proxy**

Set up Nginx to reverse-proxy and encrypt all incoming traffic. This also has the benefit of all extra features that Nginx provides, at the cost of more infrastructure to be configured and supported.


