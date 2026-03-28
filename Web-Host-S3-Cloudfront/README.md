# 🌐 Static Website Hosting using AWS (S3 + CloudFront)

This project demonstrates how to host a static website using **Amazon S3** and deliver it globally using **CloudFront CDN** — without purchasing a custom domain.

---

## 🚀 Project Architecture

```
User → CloudFront → S3 (Private Bucket)
```

---

## 📌 Services Used

* Amazon S3 (Storage for static files)
* Amazon CloudFront (CDN for fast delivery + HTTPS)

---

## 📁 Project Structure

```
.
├── index.html
├── error.html
```

---

## 🧱 Step-by-Step Implementation

### ✅ Step 1: Create Website Files

Create two files:

**index.html**

```html
<!DOCTYPE html>
<html>
<head>
  <title>PM Demo</title>
</head>
<body>
  <h1>Welcome 🚀</h1>
  <p>This site is hosted on AWS S3 + CloudFront</p>
</body>
</html>
```

**error.html**

```html
<h1>Oops! Page not found</h1>
```

---

### ✅ Step 2: Create S3 Bucket

Go to AWS → Amazon S3

* Bucket name: `pmdemo.com`
* Region: Mumbai (ap-south-1)
* Disable **Block all public access** (only for testing)
* Create bucket

---

### ✅ Step 3: Enable Static Website Hosting

* Go to **Properties**
* Enable **Static website hosting**

```
Index document: index.html
Error document: error.html
```

---

### ⚠️ Important Note

* Files must be named:

  * `index.html` (NOT index.html.txt)
  * `error.html`
* Upload files to **root of bucket** (not inside folder)

---

### ✅ Step 4: Upload Files

Upload:

* index.html
* error.html

---

### 🧪 Step 5: Test S3 Website

Use S3 endpoint:

```
http://pmdemo.com.s3-website-ap-south-1.amazonaws.com
```

---

### ✅ Step 6: Create CloudFront Distribution

Go to AWS → CloudFront

* Origin: Select S3 bucket (`pmdemo.com`)
* Enable **Origin Access Control (OAC)**
* Viewer Protocol Policy: Redirect HTTP → HTTPS
* Default root object: `index.html`

Wait for deployment (~5–10 minutes)

---

### 🔒 Step 7: Secure S3 Bucket

* Enable **Block all public access**
* Remove any public bucket policy

Now only CloudFront can access S3

---

### 🧪 Step 8: Test Website via CloudFront

Copy CloudFront URL:

```
https://<your-distribution-id>.cloudfront.net
```

---

## 🎯 Key Learnings

* How to host static websites on AWS
* Difference between S3 public hosting and CloudFront CDN
* Importance of OAC (secure access)
* How HTTPS works with CloudFront

---

## ⚠️ Common Errors & Fixes

### ❌ Website not loading

* Check file names (must be `.html`)
* Ensure files are in root directory

### ❌ Access Denied

* Check bucket permissions
* Verify OAC configuration

### ❌ 403 Forbidden

* Default root object missing (`index.html`)

---

## 💡 Future Improvements

* Add custom domain using Route 53
* Automate deployment using Terraform
* Add CI/CD with GitHub Actions

---

## 📌 Resume Line

> Deployed a scalable static website using Amazon S3 and CloudFront with secure access (OAC) and HTTPS delivery.

---

## 👨‍💻 Author

**Pratik Mulik**
