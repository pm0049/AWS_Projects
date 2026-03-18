# Highly Available Web Application on AWS

A production-grade, highly available web application deployed on AWS using EC2, Application Load Balancer (ALB), and Auto Scaling Group (ASG). The app automatically scales, self-heals, and spans multiple Availability Zones for zero single points of failure.

---

## Architecture

```
Internet
    │
    ▼
Application Load Balancer (ALB)
    │           │
    ▼           ▼
EC2 (AZ-a)   EC2 (AZ-b)
    └─────────────┘
    Auto Scaling Group
         (VPC)
```

**Traffic flow:** User → ALB → EC2 instances (distributed across 2 AZs)

---

## AWS Services Used

| Service | Purpose |
|--------|---------|
| VPC | Isolated private network |
| EC2 | Web server instances |
| Application Load Balancer | Distributes traffic, health checks |
| Auto Scaling Group | Self-healing, automatic replacement |
| Security Groups | Firewall rules |
| Internet Gateway | Internet access for the VPC |

---

## Infrastructure Overview

| Resource | Value |
|----------|-------|
| Region | ap-south-1 (Mumbai) |
| VPC CIDR | 10.0.0.0/16 |
| Subnet A | 10.0.1.0/24 (ap-south-1a) |
| Subnet B | 10.0.2.0/24 (ap-south-1b) |
| Instance Type | t2.micro |
| AMI | Amazon Linux 2023 |
| Web Server | Apache (httpd) |
| Min Instances | 2 |
| Max Instances | 4 |
| Desired Instances | 2 |

---

## What Makes This Highly Available

- **Multi-AZ deployment** — instances run in two separate Availability Zones. If one AZ has an outage, the other keeps serving traffic.
- **ALB health checks** — the load balancer continuously checks each instance. If one fails, it stops sending traffic to it automatically.
- **Auto Scaling Group** — if an instance is terminated or becomes unhealthy, ASG detects it and launches a replacement automatically within 60–90 seconds.
- **No single point of failure** — the ALB, instances, and subnets are all redundant.

---

## Project Structure

```
├── README.md
└── userdata.sh          # Bootstrap script — installs Apache on EC2 launch
```

---

## User Data Script

This script runs automatically on every EC2 instance at first boot via cloud-init. It installs Apache, starts it, and writes the HTML page.

```bash
#!/bin/bash
yum update -y
yum install -y httpd
systemctl start httpd
systemctl enable httpd
AZ=$(curl -s http://169.254.169.254/latest/meta-data/placement/availability-zone)
echo "<html><head><title>HA App</title>
<style>
body{font-family:sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;background:#f0f4f8;}
.card{background:white;padding:40px 60px;border-radius:12px;text-align:center;}
h1{color:#1a73e8;}
.az{background:#e8f0fe;color:#1a73e8;padding:8px 20px;border-radius:20px;font-weight:bold;display:inline-block;margin-top:12px;}
</style></head>
<body><div class='card'>
<h1>Hello from your HA Web App!</h1>
<p>This request was served by an EC2 instance in:</p>
<div class='az'>$AZ</div>
</div></body></html>" > /var/www/html/index.html
```

---

## Setup Guide

### Prerequisites
- AWS account with console access
- Basic understanding of AWS networking

---

### Phase 1 — VPC & Networking

1. **Create VPC**
   - Name: `my-pm-vpc`
   - IPv4 CIDR: `10.0.0.0/16`

2. **Create 2 public subnets**
   - `public-subnet-a` → AZ: `ap-south-1a` → CIDR: `10.0.1.0/24`
   - `public-subnet-b` → AZ: `ap-south-1b` → CIDR: `10.0.2.0/24`
   - Enable **Auto-assign public IPv4** on both subnets

3. **Create Internet Gateway**
   - Name: `my-pm-igw`
   - Attach to `my-pm-vpc`

4. **Create Route Table**
   - Name: `public-rt`
   - Add route: `0.0.0.0/0` → `my-pm-igw`
   - Associate both subnets

---

### Phase 2 — Security Groups

**ALB Security Group (`alb-sg`)**
| Direction | Type | Port | Source |
|-----------|------|------|--------|
| Inbound | HTTP | 80 | 0.0.0.0/0 |
| Outbound | All | All | 0.0.0.0/0 |

**EC2 Security Group (`ec2-sg`)**
| Direction | Type | Port | Source |
|-----------|------|------|--------|
| Inbound | HTTP | 80 | `alb-sg` (SG ID) |
| Outbound | All | All | 0.0.0.0/0 |

> EC2 instances only accept traffic from the ALB — never directly from the internet.

---

### Phase 3 — EC2 Launch Template

- Name: `my-ha-template`
- AMI: Amazon Linux 2023
- Instance type: `t2.micro` 
- Security group: `ec2-sg`
- Key pair: None (managed via user data)
- User data: paste the bootstrap script above

---

### Phase 4 — Auto Scaling Group

- Name: `my-pm-asg`
- Launch template: `my-pm-template`
- VPC: `my-ha-vpc`
- Subnets: `public-subnet-a`, `public-subnet-b`
- Load balancer: Create new ALB named `my-ha-alb` (internet-facing)
- Target group: `my-pm-tg`
- Health checks: ELB health checks enabled
- Desired: `2` | Min: `2` | Max: `4`

---

### Phase 5 — Verify

1. Go to **EC2 → Target Groups → `my-pm-tg` → Targets**
2. Wait for both instances to show **Healthy**
3. Go to **EC2 → Load Balancers → `my-pm-alb`** → copy the DNS name
4. Open `http://<alb-dns-name>` in your browser
5. Hard refresh (`Ctrl+Shift+R`) — the AZ label should alternate between `ap-south-1a` and `ap-south-1b`

---

## Testing High Availability

### Test 1 — Load balancing
Open the ALB URL and hard refresh multiple times. The AZ displayed should alternate, proving traffic is being distributed across both instances.

### Test 2 — Self healing
1. Go to EC2 → Instances → terminate one instance manually
2. Watch the ASG Activity tab — it detects the termination within seconds
3. A new instance launches automatically within 60–90 seconds
4. Your site stays up throughout — the other AZ keeps serving traffic

### Test 3 — Health check failover
If Apache crashes on one instance, the ALB health check detects it within ~30 seconds and removes it from the rotation automatically.

---

## Security Notes

- EC2 instances are not directly accessible from the internet
- Only the ALB can communicate with EC2 on port 80 (enforced via SG-to-SG rule)
- No SSH key pair — instances are fully managed via user data and ASG
- All resources are within a custom VPC, not the default VPC

---

## Clean Up

To avoid ongoing AWS charges, delete resources in this order:

1. Delete Auto Scaling Group (`my-pm-asg`) — this also terminates EC2 instances
2. Delete Load Balancer (`my-pm-alb`)
3. Delete Target Group (`my-pm-tg`)
4. Delete Launch Template (`my-pm-template`)
5. Delete Security Groups (`alb-sg`, `ec2-sg`)
6. Detach and delete Internet Gateway (`my-pm-igw`)
7. Delete Subnets and Route Table
8. Delete VPC (`my-pm-vpc`)

---

## Key Learnings

- Security groups can reference other security groups as sources — this is more secure and flexible than using IP ranges
- User data scripts run once at first boot via cloud-init — check system logs to debug
- ASG desired capacity drives instance count — if set to 0, no instances launch
- ALB and EC2 security groups must be in the same VPC — cross-VPC SG references silently fail
- "Request timed out" on health checks almost always means a security group is blocking port 80

---

## Author

<img width="1850" height="910" alt="Image" src="https://github.com/user-attachments/assets/be5d7a43-8fc8-44c6-87ee-e54ebd7de70c" />


Target Group
<img width="1918" height="852" alt="Image" src="https://github.com/user-attachments/assets/a2293214-9698-4181-bbe0-c984fc445cf8" />

Auto Scalling Group
<img width="1612" height="766" alt="Image" src="https://github.com/user-attachments/assets/f68611f9-0b71-4258-8743-760dbb6dea1f" />

Load Balancer
<img width="1602" height="750" alt="Image" src="https://github.com/user-attachments/assets/3ff0ee6a-642f-4e7f-9c27-387ea0b048a0" />

Built as part of an AWS hands-on project series. Focused on understanding core HA patterns used in production environments.