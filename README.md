# WaConnect📞

Aplikasi penghubung Whatsapp dengan chatbot

## Setup

1. `npm install

2. membuat .env

3. sesuaikan .env dengan .env.example db Anda

4. `npx prisma migrate dev -nama_migrate` / `npx prisma generate`

- migrate schema

### Cara pemakaian WaConnect

Ada 2 cara pemakaian nya WaConnect

1. Bisa langsung scan Qr code
2. bisa menggunakan session lalu scan Qr code dengan menggunakan Authentikasi

=============================================

#### Cara pemakaian 1 ( Dianjurkan pakai ini yaitu mySession )

cara memakainya :

1. `npm run start`

- menjalankan WhatsApp

2. Scan QR code di terminal/ di dalam folder waConnect/sessions/qrcodes/ mySessions.png dengan aplikasi Whatsapp Anda

3. Berhasil tertautkan dengan Whatsapp Anda

#### Cara pemakaian 2

1. `npm run start`

- menjalankan WhatsApp

2. login

```
username: fadliAsyp
sender: 08123456789
```

maka akan menghasilkan Token

3. create sessions

- memasukan dengan `sessionsName: fadliSession` beserta tokennya > maka akan muncul qr code di folder session/qrcodes namaSession.png

4. Scan QR code

5. Berhasil tertautkan dengan Whatsapp Anda

### cara memutuskan tautan

1. buka whatsapp Anda
2. titik tiga diatas > perangkat tautan > putuskan tautan

`rm -rf tokens/mySession`
menghapus token/merefresh token

catatan :

6281234567890@c.us

- untuk perorang/induvidu

- Di bagian tautan undangan grup, Anda akan melihat tautan seperti https://chat.whatsapp.com/ABCDEFGHIJKL.​
- Kode unik setelah https://chat.whatsapp.com/ adalah ID grup.

===============================================

# service-channel-email✉️

### Dependencies yang Perlu Diinstal
npm install googleapis dotenv
npm install nodemailer

### 1. Buat App Password di Google (Gunakan Verifikasi 2 Langkah)
1. Buka halaman https://myaccount.google.com/apppasswords
2. Pilih Mail sebagai aplikasi, dan Other (Custom name) untuk perangkat, misalnya `Chatbot Email`
3. Simpan password yang diberikan — digunakan saat otentikasi

### 2. Aktifkan Gmail API dan Dapatkan Credential
1. Masuk ke Google Cloud Console (https://console.cloud.google.com/)
2. Buat proyek baru atau gunakan proyek yang sudah ada
3. Aktifkan Gmail API
4. Buka menu OAuth consent screen
   - Isi informasi dasar seperti nama aplikasi, email, dll.
   - Tambahkan scope: `https://www.googleapis.com/auth/gmail.readonly`
5. Masuk ke Credentials
   - Klik Create Credentials → OAuth Client ID
   - Pilih Application type: `Desktop App`
   - Salin Client ID dan Client Secret, lalu masukkan ke file .env

### 3. Konfigurasi File .env
Untuk mengautentikasi akun Gmail dan mendapatkan access token serta refresh token, jalankan:

node gmailAuth.js

Salin access token dan refresh token, lalu masukkan ke file .env

Terakhir, jalankan npm run start

## Getting started

To make it easy for you to get started with GitLab, here's a list of recommended next steps.

Already a pro? Just edit this README.md and make it your own. Want to make it easy? [Use the template at the bottom](#editing-this-readme)!

## Add your files

- [ ] [Create](https://docs.gitlab.com/ee/user/project/repository/web_editor.html#create-a-file) or [upload](https://docs.gitlab.com/ee/user/project/repository/web_editor.html#upload-a-file) files
- [ ] [Add files using the command line](https://docs.gitlab.com/ee/gitlab-basics/add-file.html#add-a-file-using-the-command-line) or push an existing Git repository with the following command:

```
cd existing_repo
git remote add origin https://gitlab.jatimprov.go.id/wildanalmubarok/service-channel-email.git
git branch -M main
git push -uf origin main
```

## Integrate with your tools

- [ ] [Set up project integrations](https://gitlab.jatimprov.go.id/wildanalmubarok/service-channel-email/-/settings/integrations)

## Collaborate with your team

- [ ] [Invite team members and collaborators](https://docs.gitlab.com/ee/user/project/members/)
- [ ] [Create a new merge request](https://docs.gitlab.com/ee/user/project/merge_requests/creating_merge_requests.html)
- [ ] [Automatically close issues from merge requests](https://docs.gitlab.com/ee/user/project/issues/managing_issues.html#closing-issues-automatically)
- [ ] [Enable merge request approvals](https://docs.gitlab.com/ee/user/project/merge_requests/approvals/)
- [ ] [Set auto-merge](https://docs.gitlab.com/ee/user/project/merge_requests/merge_when_pipeline_succeeds.html)

## Test and Deploy

Use the built-in continuous integration in GitLab.

- [ ] [Get started with GitLab CI/CD](https://docs.gitlab.com/ee/ci/quick_start/)
- [ ] [Analyze your code for known vulnerabilities with Static Application Security Testing (SAST)](https://docs.gitlab.com/ee/user/application_security/sast/)
- [ ] [Deploy to Kubernetes, Amazon EC2, or Amazon ECS using Auto Deploy](https://docs.gitlab.com/ee/topics/autodevops/requirements.html)
- [ ] [Use pull-based deployments for improved Kubernetes management](https://docs.gitlab.com/ee/user/clusters/agent/)
- [ ] [Set up protected environments](https://docs.gitlab.com/ee/ci/environments/protected_environments.html)

---

# Editing this README

When you're ready to make this README your own, just edit this file and use the handy template below (or feel free to structure it however you want - this is just a starting point!). Thanks to [makeareadme.com](https://www.makeareadme.com/) for this template.

## Suggestions for a good README

Every project is different, so consider which of these sections apply to yours. The sections used in the template are suggestions for most open source projects. Also keep in mind that while a README can be too long and detailed, too long is better than too short. If you think your README is too long, consider utilizing another form of documentation rather than cutting out information.

## Name

Choose a self-explaining name for your project.

## Description

Let people know what your project can do specifically. Provide context and add a link to any reference visitors might be unfamiliar with. A list of Features or a Background subsection can also be added here. If there are alternatives to your project, this is a good place to list differentiating factors.

## Badges

On some READMEs, you may see small images that convey metadata, such as whether or not all the tests are passing for the project. You can use Shields to add some to your README. Many services also have instructions for adding a badge.

## Visuals

Depending on what you are making, it can be a good idea to include screenshots or even a video (you'll frequently see GIFs rather than actual videos). Tools like ttygif can help, but check out Asciinema for a more sophisticated method.

## Installation

Within a particular ecosystem, there may be a common way of installing things, such as using Yarn, NuGet, or Homebrew. However, consider the possibility that whoever is reading your README is a novice and would like more guidance. Listing specific steps helps remove ambiguity and gets people to using your project as quickly as possible. If it only runs in a specific context like a particular programming language version or operating system or has dependencies that have to be installed manually, also add a Requirements subsection.

## Usage

Use examples liberally, and show the expected output if you can. It's helpful to have inline the smallest example of usage that you can demonstrate, while providing links to more sophisticated examples if they are too long to reasonably include in the README.

## Support

Tell people where they can go to for help. It can be any combination of an issue tracker, a chat room, an email address, etc.

## Roadmap

If you have ideas for releases in the future, it is a good idea to list them in the README.

## Contributing

State if you are open to contributions and what your requirements are for accepting them.

For people who want to make changes to your project, it's helpful to have some documentation on how to get started. Perhaps there is a script that they should run or some environment variables that they need to set. Make these steps explicit. These instructions could also be useful to your future self.

You can also document commands to lint the code or run tests. These steps help to ensure high code quality and reduce the likelihood that the changes inadvertently break something. Having instructions for running tests is especially helpful if it requires external setup, such as starting a Selenium server for testing in a browser.

## Authors and acknowledgment

Show your appreciation to those who have contributed to the project.

## License

For open source projects, say how it is licensed.

## Project status

If you have run out of energy or time for your project, put a note at the top of the README saying that development has slowed down or stopped completely. Someone may choose to fork your project or volunteer to step in as a maintainer or owner, allowing your project to keep going. You can also make an explicit request for maintainers.
