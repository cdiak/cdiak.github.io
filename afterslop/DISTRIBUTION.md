# Afterslop public downloads

The marketing page is at https://cdiak.github.io/afterslop/ (public).

Source code and private builds live in **cdiak/afterslop** (private).  
**Release DMG URLs must not point at that repo** — GitHub returns 404 for guests.

## Public DMG hosting

Upload notarized DMGs to **cdiak/cdiak.github.io** Releases (public):

```bash
cd ~/Development/Projects/xAI/afterslop-v2
./bin/publish-public-dmg all
```

Then verify (logged out or private window):

- https://github.com/cdiak/cdiak.github.io/releases/download/v0.2.0/afterslop_0.2.0_aarch64.dmg

Intel (x86_64) remains on v0.1.8 until a 0.2.0 Intel build is published.

Update `afterslop/index.html` if the tag or filenames change.

## Optional: private repo releases

`./bin/publish-release-dmg` on **cdiak/afterslop** is for collaborators only (same binaries, private GitHub auth).