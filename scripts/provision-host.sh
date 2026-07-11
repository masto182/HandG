#!/usr/bin/env bash
# scripts/provision-host.sh
#
# Idempotent OS provisioning for a Hops & Glory deployment host (Oracle Cloud
# Ubuntu ARM64). Safe to re-run. Installs Docker Engine + compose plugin,
# creates the deploy directory, opens the firewall for 80/443 (the OCI iptables
# gotcha), and clones the repo so deploy-prod.yml / deploy-staging.yml can
# `git fetch` on the box.
#
# Usage (as the ubuntu user on the target host):
#   sudo bash provision-host.sh
#
# Override defaults via env:
#   DEPLOY_DIR=/opt/retail-example DEPLOY_USER=ubuntu bash provision-host.sh

set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/masto182/HandG.git}"
DEPLOY_DIR="${DEPLOY_DIR:-/opt/retail-example}"
DEPLOY_USER="${DEPLOY_USER:-ubuntu}"
OPEN_PORTS="${OPEN_PORTS:-80 443}"

log() { echo "[provision] $*"; }

if [ "$(id -u)" -ne 0 ]; then
  log "Re-executing under sudo..."
  exec sudo -E bash "$0" "$@"
fi

# ── Docker Engine + compose plugin ────────────────────────────────────────────
if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
  log "Docker + compose plugin already installed: $(docker --version)"
else
  log "Installing Docker Engine + compose plugin..."
  . /etc/os-release
  install -m 0755 -d /etc/apt/keyrings
  if [ ! -f /etc/apt/keyrings/docker.asc ]; then
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
    chmod a+r /etc/apt/keyrings/docker.asc
  fi
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu ${VERSION_CODENAME} stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update -y
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  systemctl enable --now docker
fi

# Let the deploy user run docker without sudo.
if id -nG "$DEPLOY_USER" | tr ' ' '\n' | grep -qx docker; then
  log "$DEPLOY_USER already in docker group"
else
  log "Adding $DEPLOY_USER to docker group"
  usermod -aG docker "$DEPLOY_USER"
fi

# ── Deploy directory + repo clone ─────────────────────────────────────────────
mkdir -p "$DEPLOY_DIR"
chown "$DEPLOY_USER:$DEPLOY_USER" "$DEPLOY_DIR"
if [ -d "$DEPLOY_DIR/.git" ]; then
  log "Repo already cloned at $DEPLOY_DIR"
else
  log "Cloning $REPO_URL -> $DEPLOY_DIR"
  sudo -u "$DEPLOY_USER" git clone "$REPO_URL" "$DEPLOY_DIR"
fi

# ── Firewall: open 80/443 (OCI images ship an iptables REJECT in INPUT) ───────
# Install iptables-persistent non-interactively so the rules survive reboot.
if ! dpkg -s iptables-persistent >/dev/null 2>&1; then
  log "Installing iptables-persistent (non-interactive)"
  echo "iptables-persistent iptables-persistent/autosave_v4 boolean false" | debconf-set-selections
  echo "iptables-persistent iptables-persistent/autosave_v6 boolean false" | debconf-set-selections
  DEBIAN_FRONTEND=noninteractive apt-get install -y iptables-persistent
fi

for port in $OPEN_PORTS; do
  if iptables -C INPUT -p tcp --dport "$port" -j ACCEPT 2>/dev/null; then
    log "iptables: port $port already allowed"
  else
    # Insert the ACCEPT before the first REJECT rule so it actually takes effect.
    rej_line="$(iptables -L INPUT --line-numbers -n | awk '/REJECT/{print $1; exit}')"
    if [ -n "$rej_line" ]; then
      log "iptables: allowing $port (inserted at line $rej_line, before REJECT)"
      iptables -I INPUT "$rej_line" -p tcp --dport "$port" -j ACCEPT
    else
      log "iptables: allowing $port (appended)"
      iptables -A INPUT -p tcp --dport "$port" -j ACCEPT
    fi
  fi
done

log "Persisting iptables rules"
netfilter-persistent save

log "Done. Docker: $(docker --version); compose: $(docker compose version | head -1)"
log "Deploy dir: $DEPLOY_DIR (branch $(sudo -u "$DEPLOY_USER" git -C "$DEPLOY_DIR" rev-parse --abbrev-ref HEAD 2>/dev/null || echo '?'))"
log "NOTE: '$DEPLOY_USER' docker group membership applies on next login/SSH session."
