const fs = require('fs');
const path = require('path');

const snapshot = '2026-08-09 23:20 (Asia/Shanghai)';
const outputDir = path.resolve(process.argv[2] || path.join(__dirname, '..', 'work', '网络配置环境知识库'));

const categories = {
  tutorial: {
    file: '02-网络基础与教程.md',
    title: '网络基础与教程',
    verify: '完成一个最小实验或练习，并记录拓扑、命令、预期结果和实际结果。',
    caution: '教程可能包含旧版本命令；实施前应对照项目 README 和软件官方文档。'
  },
  diagnosis: {
    file: '03-诊断抓包与监控.md',
    title: '诊断、抓包与监控',
    verify: '先建立正常基线，再制造一个可控故障，确认工具能捕获延迟、丢包、端口或协议异常。',
    caution: '抓包和扫描只用于本人设备、实验环境或明确授权目标；捕获文件可能包含账号、Cookie 和业务数据。'
  },
  automation: {
    file: '04-自动化路由与实验环境.md',
    title: '网络自动化、路由与实验环境',
    verify: '先执行 dry-run/检查模式或在虚拟拓扑中运行，再比较变更前后配置并验证连通性。',
    caution: '自动化可能一次影响大量设备；必须使用版本控制、配置备份、审批和可执行的回滚方案。'
  },
  vpn: {
    file: '05-VPN与异地组网.md',
    title: 'VPN 与异地组网',
    verify: '从两台测试设备验证握手、路由、DNS、访问控制和断线重连，并确认未出现 DNS/WebRTC 泄漏。',
    caution: '只连接可信控制面和自有节点；保护私钥、限制管理端口，并遵守所在地法律与组织政策。'
  },
  proxy: {
    file: '06-代理反向代理与隧道.md',
    title: '代理、反向代理与隧道',
    verify: '用测试域名或临时端口验证入口、TLS、鉴权、日志和关闭隧道后的不可达状态。',
    caution: '不要导入来源不明的免费节点或订阅；公开入口必须有鉴权、TLS、速率限制和日志审计。'
  },
  dns: {
    file: '07-DNS与域名管理.md',
    title: 'DNS 与域名管理',
    verify: '用 `dig`/`nslookup` 对比本地解析器与权威结果，检查缓存、DNSSEC、上游故障和回退行为。',
    caution: '占用 53 端口前先确认现有解析服务；更改全网 DHCP/DNS 前保留旧地址和快速回滚方法。'
  },
  kubernetes: {
    file: '08-Kubernetes与容器网络.md',
    title: 'Kubernetes 与容器网络',
    verify: '在非生产集群验证 Pod-to-Pod、Service、DNS、NetworkPolicy、跨节点和升级/卸载路径。',
    caution: 'CNI 是集群基础设施，不能在生产集群直接替换；先核对 Kubernetes、内核和数据平面兼容矩阵。'
  }
};

const projects = [
  { repo: 'trimstray/the-book-of-secret-knowledge', stars: 237446, category: 'tutorial', role: '网络、系统、TLS、DNS、命令行和故障排查手册索引，适合按问题查资料。', start: '打开 README，先看 Networking、CLI tools、SysOps 等章节；把实际需要的条目加入自己的学习清单。' },
  { repo: 'ossu/computer-science', stars: 207805, category: 'tutorial', role: '免费的计算机科学自学路线，其中网络课程用于系统补齐协议与分层基础。', start: '按 curriculum 先修关系学习网络课程；不要跳过操作系统和编程基础，并完成课程作业。' },
  { repo: 'jlevy/the-art-of-command-line', stars: 162055, category: 'tutorial', role: '命令行速查与方法论，涵盖 SSH、curl、端口、进程和文本管道等网络运维基础。', start: '克隆或直接阅读 README，从日常命令开始，在测试主机逐条验证网络相关示例。' },
  { repo: '2dust/v2rayN', stars: 113459, category: 'proxy', role: 'Windows、Linux、macOS 图形化代理客户端，可管理 Xray、sing-box 等内核。', start: '从 Releases 下载官方包，校验发布者；导入自有或可信配置，先启用局部代理并访问测试站点验证。' },
  { repo: 'fatedier/frp', stars: 108659, category: 'proxy', role: '把 NAT/防火墙后的自有服务通过公网服务器安全暴露的反向代理。', start: '在公网机配置 `frps.toml`，内网机配置 `frpc.toml`；先映射临时端口，启用令牌/TLS 后再绑定正式域名。' },
  { repo: 'louislam/uptime-kuma', stars: 90016, category: 'diagnosis', role: '自托管可用性监控，支持 HTTP、TCP、Ping、DNS、Docker 和告警。', start: '用官方 Docker 示例启动，创建一个测试监控项和通知渠道，再配置数据卷备份。' },
  { repo: 'Developer-Y/cs-video-courses', stars: 82964, category: 'tutorial', role: '大学计算机课程索引，可筛选 Computer Networks 和分布式系统公开视频。', start: '在 README 搜索 Computer Networks，选择一门带作业的课程并按周完成，不要只收藏视频。' },
  { repo: 'netdata/netdata', stars: 80090, category: 'diagnosis', role: '实时主机、容器和应用可观测平台，可查看网卡、连接、丢包和服务健康。', start: '在测试机按官方安装器或容器方式部署，只开放受控访问；观察一段基线后设置网络告警。' },
  { repo: 'ansible/ansible', stars: 70271, category: 'automation', role: '无代理 IT 自动化平台，可通过厂商 collection 批量管理网络设备配置。', start: '创建 Python 虚拟环境并安装 Ansible；建立测试 inventory，先运行 facts 和 `--check --diff`，再应用小变更。' },
  { repo: '2dust/v2rayNG', stars: 60868, category: 'proxy', role: 'Android 上的 V2Ray/Xray 图形客户端。', start: '只从 GitHub Releases 或可信应用商店安装；导入自有配置，先检查分应用代理与 DNS 设置。' },
  { repo: 'pi-hole/pi-hole', stars: 60270, category: 'dns', role: '局域网级 DNS 广告与跟踪域名拦截服务。', start: '优先用官方 Docker 镜像测试，映射持久化目录和 53 端口；单台设备改 DNS 验证后再改 DHCP。' },
  { repo: 'shadowsocks/shadowsocks-windows', stars: 59576, category: 'proxy', role: 'Windows Shadowsocks 客户端，适合连接自己管理或明确可信的服务器。', start: '从 Releases 下载并核对签名/哈希；添加自有服务器，先使用 PAC/局部代理测试，再考虑系统代理。' },
  { repo: 'chen08209/FlClash', stars: 48116, category: 'proxy', role: '基于 Clash Meta 的多平台图形客户端，支持规则、节点和流量查看。', start: '从官方 Releases 安装；导入可信配置，检查 DNS、TUN 和规则模式，先不启用开机自启。' },
  { repo: 'v2ray/v2ray-core', stars: 46946, category: 'proxy', role: '较早的 V2Ray 核心仓库，适合研究配置结构或维护遗留部署。', start: '新部署优先评估仍活跃的 v2fly/Xray；遗留环境先备份 JSON 配置，用内置检查确认后再重启。', risk: '该仓库不是当前首选维护线，避免把高 Star 误判为最佳新部署方案。' },
  { repo: 'MHSanaei/3x-ui', stars: 44528, category: 'proxy', role: '多用户、多协议 Xray 管理面板，提供流量、到期和用户管理。', start: '仅在隔离测试服务器按官方文档部署；立即改管理员入口和密码，限制防火墙来源并启用 TLS。', risk: '管理面板属于高价值攻击面，不建议直接暴露在公网。' },
  { repo: 'mitmproxy/mitmproxy', stars: 44618, category: 'diagnosis', role: '支持 TLS 的交互式 HTTP(S) 代理，用于开发调试、接口分析和自动化测试。', start: '用 `pipx install mitmproxy` 安装；只在测试设备安装其 CA，代理一个自有应用并用过滤器缩小捕获范围。' },
  { repo: 'juanfont/headscale', stars: 42657, category: 'vpn', role: 'Tailscale 控制服务器的开源自托管实现，适合自主控制设备目录。', start: '按官方容器/二进制文档生成配置和数据库；创建测试用户与预授权密钥，再让两台客户端接入。' },
  { repo: 'curl/curl', stars: 42559, category: 'diagnosis', role: '支持大量协议的命令行传输工具，是 HTTP/TLS/DNS/API 连通性排查基础工具。', start: '从 `curl -v https://目标`、`--resolve`、`--connect-timeout` 开始；输出含凭据时先脱敏再保存。' },
  { repo: 'XTLS/Xray-core', stars: 40963, category: 'proxy', role: '可编程代理核心，支持多种入站、出站、路由和传输组合。', start: '从官方示例复制最小配置，执行配置检查；以非管理员用户运行并只开放需要的监听端口。' },
  { repo: 'AdguardTeam/AdGuardHome', stars: 36023, category: 'dns', role: '带 Web 管理界面的全网 DNS 拦截、重写和客户端统计服务。', start: '用 Docker 暂时映射管理端口和 53 端口；先让一台设备使用它，确认上游和白名单后再覆盖全网。' },
  { repo: 'tailscale/tailscale', stars: 34973, category: 'vpn', role: '基于 WireGuard 的设备组网，提供身份登录、ACL、子网路由和出口节点。', start: '在两台测试设备安装客户端并执行 `tailscale up`；验证点对点地址后，再逐项启用 ACL 或子网路由。' },
  { repo: 'v2fly/v2ray-core', stars: 34452, category: 'proxy', role: 'V2Ray 社区维护核心，用配置文件组合代理、路由和传输。', start: '从官方文档的最小客户端/服务端示例开始；执行配置验证，检查监听地址和日志后再设为服务。' },
  { repo: 'ehang-io/nps', stars: 34158, category: 'proxy', role: '带 Web 管理的内网穿透服务器，支持 TCP、UDP、HTTP、SOCKS5 等转发。', start: '在测试公网机部署服务端、内网机部署客户端；限制管理端来源并用强凭据，先映射临时端口。' },
  { repo: 'hiddify/hiddify-app', stars: 31983, category: 'proxy', role: '多平台代理客户端，支持 sing-box、Xray、TUIC、Hysteria 等。', start: '从官方发布渠道安装；只添加可信配置，逐项核对 DNS、TUN、分流和自动更新来源。' },
  { repo: 'trailofbits/algo', stars: 30352, category: 'vpn', role: '在云主机上自动部署个人 IPsec/WireGuard VPN 的 Ansible 方案。', start: '准备独立云账号和最小权限凭据；在本地虚拟环境运行向导，部署后撤销不再需要的云权限。' },
  { repo: 'hwdsl2/setup-ipsec-vpn', stars: 28318, category: 'vpn', role: '快速部署 IPsec/L2TP、Cisco IPsec 和 IKEv2 VPN 的脚本与客户端说明。', start: '只在新建测试云主机运行；先审阅脚本和环境变量，部署后保存生成凭据并收紧防火墙。' },
  { repo: 'netbirdio/netbird', stars: 28183, category: 'vpn', role: '基于 WireGuard 的零信任组网，支持 SSO、MFA 和细粒度访问策略。', start: '先使用官方快速开始连接两台设备；需要自托管时再部署管理、信令和中继组件并配置备份。' },
  { repo: 'openwrt/openwrt', stars: 27915, category: 'automation', role: '面向路由器和嵌入式设备的 Linux 发行版与构建系统。', start: '普通用户先用官方 Image Builder/固件选择器；核对设备型号、分区和恢复方式，备份原固件后再刷写。', risk: '刷错型号可能导致设备无法启动，必须先准备串口/TFTP/恢复模式。' },
  { repo: 'robertdavidgraham/masscan', stars: 25923, category: 'diagnosis', role: '高速 TCP 端口扫描器，适合大型自有地址空间的资产盘点。', start: '仅对书面授权网段设置很低速率开始，保存目标和排除列表；结果再交给 Nmap 做精确验证。', risk: '默认高速度可能压垮网络或触发告警，禁止扫描互联网或未授权目标。' },
  { repo: 'hagezi/dns-blocklists', stars: 25165, category: 'dns', role: '面向多种 DNS/广告拦截器的分级域名阻止列表。', start: '从 Light/Normal 等低干扰列表选一个，不要叠加全部；观察误杀日志并维护允许列表。' },
  { repo: 'cilium/cilium', stars: 24895, category: 'kubernetes', role: '基于 eBPF 的 Kubernetes 网络、安全策略、负载均衡与可观测平台。', start: '运行官方 CLI preflight，核对内核与集群兼容性；在测试集群安装并用 connectivity test 验证。' },
  { repo: 'apernet/hysteria', stars: 22277, category: 'proxy', role: '基于 QUIC 的高性能代理，面向高延迟和丢包链路。', start: '在自有服务器生成 TLS 配置，先使用最小服务端/客户端配置；限制监听与认证并测量实际丢包。' },
  { repo: 'MatsuriDayo/NekoBoxForAndroid', stars: 22240, category: 'proxy', role: 'Android 通用代理客户端，基于 sing-box 工具链。', start: '从官方发布页安装，导入可信配置；先检查 VPN 权限、应用分流和 DNS，再启用常驻服务。' },
  { repo: 'fosrl/pangolin', stars: 22134, category: 'vpn', role: '基于 WireGuard 的身份感知 VPN 与反向隧道，用于远程访问私有服务。', start: '按官方 Docker Compose 在测试域名部署；配置 TLS、身份提供商和最小资源权限后再邀请用户。' },
  { repo: 'netbox-community/netbox', stars: 21280, category: 'automation', role: '网络 Source of Truth，管理设备、机架、IPAM、VLAN、电路和自动化数据。', start: '用官方 Docker 项目搭测试实例；先导入少量设备/IP 数据，定义数据所有者后再供自动化读取。' },
  { repo: 'bee-san/RustScan', stars: 20245, category: 'diagnosis', role: '高速端口发现工具，可把结果交给 Nmap 做服务识别。', start: '只扫描授权测试主机并限制 batch/timeout；使用 `--` 把后续服务识别参数传给 Nmap。' },
  { repo: 'slackhq/nebula', stars: 17595, category: 'vpn', role: '可扩展的证书式覆盖网络，适合跨云、跨站点的主机直连。', start: '离线创建 CA 和两台测试主机证书；配置 lighthouse、最小防火墙规则和证书轮换流程。' },
  { repo: 'zerotier/ZeroTierOne', stars: 16992, category: 'vpn', role: '软件定义覆盖网络，可把分散设备连接成虚拟二层/三层网络。', start: '创建测试网络，让两台设备加入并手动授权；验证托管路由后再配置私有控制器或高级规则。' },
  { repo: 'avwo/whistle', stars: 15643, category: 'diagnosis', role: 'HTTP/HTTPS/HTTP2/WebSocket 调试代理，支持规则改写与插件。', start: '用 npm 按官方方式安装并启动；只给测试浏览器配置代理/证书，用规则文件记录可重复实验。' },
  { repo: 'cloudflare/cloudflared', stars: 15143, category: 'proxy', role: 'Cloudflare Tunnel 客户端，可在不开放入站端口时发布自有服务。', start: '先使用临时 tunnel 验证本地服务；正式环境创建命名 tunnel、DNS 和访问策略，并限制源站监听。' },
  { repo: 'librespeed/speedtest', stars: 15028, category: 'diagnosis', role: '可自托管的 HTML5 网络测速服务，适合测量内网/WAN 的用户体验。', start: '用官方容器或静态示例部署单节点；分别从有线和无线客户端多时段测试并保存基线。' },
  { repo: 'OpenVPN/openvpn', stars: 14358, category: 'vpn', role: '成熟的跨平台 TLS VPN 守护程序和客户端生态。', start: '优先使用发行版包和官方 HOWTO；用独立 PKI、非默认管理口、最小路由在两台测试机验证。' },
  { repo: 'coredns/coredns', stars: 14231, category: 'dns', role: '插件链式 DNS 服务器，也是 Kubernetes 集群 DNS 的常用实现。', start: '写最小 `Corefile`，以前台模式启动并用 `dig` 测试；逐个增加 forward、cache、health 等插件。' },
  { repo: 'DNSCrypt/dnscrypt-proxy', stars: 13557, category: 'dns', role: '支持 DNSCrypt、DoH 等加密协议的本地 DNS 代理。', start: '从示例配置复制最小 `toml`，选择可信上游；先绑定非 53 测试端口，验证后再替换系统 DNS。' },
  { repo: 'SoftEtherVPN/SoftEtherVPN', stars: 13451, category: 'vpn', role: '跨平台、多协议 VPN 服务端和客户端，兼容多种传统接入方式。', start: '按官方构建/安装文档在测试机部署，创建 Virtual Hub、用户和最小监听端口，再验证客户端。' },
  { repo: 'nmap/nmap', stars: 13327, category: 'diagnosis', role: '网络发现、端口扫描、服务识别和 NSE 检查的行业基础工具。', start: '先对 `127.0.0.1` 或自有实验机运行主机发现与常见端口扫描；逐步增加版本识别，避免直接使用侵入性脚本。' },
  { repo: 'EasyTier/EasyTier', stars: 13033, category: 'vpn', role: '去中心化、支持 WireGuard 的简单异地组网工具。', start: '用两台测试设备创建私有网络名和共享密钥；验证直连/中继、子网代理和访问控制。' },
  { repo: 'gravitl/netmaker', stars: 11742, category: 'vpn', role: '自动化创建和管理 WireGuard 虚拟网络，面向多站点和云环境。', start: '按官方 Compose 快速开始部署控制面；先接入两个测试节点，再配置网关、DNS 和 ACL。' },
  { repo: 'pymumu/smartdns', stars: 11190, category: 'dns', role: '并行查询上游并选择较快结果的本地 DNS，支持 DoT/DoH/DoQ。', start: '先在非 53 端口运行最小配置，对比多个域名解析耗时；确认无污染和错误缓存后再切换客户端。' },
  { repo: 'wireshark/wireshark', stars: 9706, category: 'diagnosis', role: '图形化协议分析器，可检查从链路层到应用层的网络报文。', start: '从官方 Wireshark 发行渠道安装；在测试接口短时捕获，用 display filter 缩小范围并及时删除敏感 pcap。' },
  { repo: 'flannel-io/flannel', stars: 9521, category: 'kubernetes', role: '简单的 Kubernetes 容器网络 fabric，常见于基础集群。', start: '确认 Pod CIDR 与现有网络不冲突；在测试集群按官方清单安装并验证跨节点 Pod 通信。' },
  { repo: 'TechnitiumSoftware/DnsServer', stars: 9457, category: 'dns', role: '带 Web 管理的权威、递归和缓存 DNS 服务，支持多种高级功能。', start: '在容器或测试 VM 部署，先监听隔离地址；创建测试 zone 并用 `dig` 验证权威与递归边界。' },
  { repo: 'kubernetes-sigs/external-dns', stars: 9058, category: 'dns', role: '根据 Kubernetes Service/Ingress 自动维护外部 DNS 记录。', start: '使用最小权限 DNS 凭据和测试 zone，先以 `--policy=upsert-only` 与 dry-run 观察计划变更。' },
  { repo: 'esnet/iperf', stars: 8676, category: 'diagnosis', role: 'TCP、UDP、SCTP 带宽和丢包测量工具，适合点到点性能测试。', start: '一端运行 `iperf3 -s`，另一端运行 `iperf3 -c 服务端`；再分别测反向、并发和 UDP，记录链路条件。' },
  { repo: 'BornToBeRoot/NETworkManager', stars: 8567, category: 'diagnosis', role: 'Windows 网络管理与排障 GUI，集合端口、Ping、路由、扫描和连接工具。', start: '从 Releases 安装便携版/安装版；先使用只读信息和 Ping 工具，涉及配置修改前导出当前设置。' },
  { repo: 'fujiapple852/trippy', stars: 7468, category: 'diagnosis', role: '结合 traceroute 与 ping 的现代终端网络路径诊断工具。', start: '从官方包安装，对自有目标运行默认追踪；对比 ICMP/UDP/TCP 模式并记录稳定时段基线。' },
  { repo: 'go-gost/gost', stars: 7258, category: 'proxy', role: '可组合的多协议代理和隧道工具，支持转发、链式代理与反向连接。', start: '从单监听、单转发的最小命令开始；显式绑定内网地址、加入认证，并把配置纳入版本控制。' },
  { repo: 'projectcalico/calico', stars: 7313, category: 'kubernetes', role: 'Kubernetes/云原生网络与网络安全，支持策略和多种数据平面。', start: '先用官方兼容矩阵与安装向导选择模式；在测试集群部署后验证默认拒绝和显式允许策略。' },
  { repo: 'netalertx/NetAlertX', stars: 6892, category: 'diagnosis', role: '持续发现局域网设备并对新设备、离线和属性变化发出告警。', start: '用容器部署并只扫描自有子网；建立设备基线、命名已知设备，再配置低噪声通知。' },
  { repo: '0xERR0R/blocky', stars: 6847, category: 'dns', role: '轻量高性能 DNS 代理和广告拦截器，适合家庭或小型网络。', start: '用最小 YAML 和非 53 测试端口启动；增加上游、缓存和单个阻止列表后观察查询日志。' },
  { repo: 'containernetworking/cni', stars: 6066, category: 'kubernetes', role: 'Linux 容器网络接口规范及参考库，是理解 CNI 插件契约的入口。', start: '先读 SPEC 和 skel 文档，再在临时 network namespace 运行示例；不要直接把示例当生产插件。' },
  { repo: 'microsoft/ethr', stars: 5865, category: 'diagnosis', role: '跨平台 TCP、UDP、ICMP 网络测量工具，可测试带宽、连接、追踪与 MyTraceRoute。', start: '两端启动 server/client 模式，先测单连接 TCP；再变更协议和并发量并记录 CPU、丢包与吞吐。' },
  { repo: 'prometheus/blackbox_exporter', stars: 5819, category: 'diagnosis', role: 'Prometheus 黑盒探测器，支持 HTTP、HTTPS、DNS、TCP、ICMP 和 gRPC。', start: '用官方示例模块启动 exporter，手工请求 `/probe` 验证；再由 Prometheus 抓取并设置告警。' },
  { repo: 'mininet/mininet', stars: 5845, category: 'automation', role: '在单机快速创建主机、交换机、链路和 SDN 控制器的仿真环境。', start: '在 Linux VM 安装，先运行最小拓扑和 `pingall`；再改变链路延迟/带宽并连接测试控制器。' },
  { repo: 'hickory-dns/hickory-dns', stars: 5353, category: 'dns', role: 'Rust 实现的 DNS 客户端、服务器和递归解析器库。', start: '开发者先运行仓库测试和示例，选择 client/server/resolver crate；生产前验证 DNSSEC 与缓存行为。' },
  { repo: 'NLnetLabs/unbound', stars: 4768, category: 'dns', role: '支持 DNSSEC 验证的递归缓存 DNS 解析器。', start: '使用发行版软件包和最小配置，在本机非 53 端口运行；用 `unbound-checkconf` 与 DNSSEC 测试域验证。' },
  { repo: 'opnsense/core', stars: 4575, category: 'automation', role: 'OPNsense 防火墙/路由系统的 GUI、API 和系统后端。', start: '普通部署使用官方镜像在虚拟机测试，配置 WAN/LAN 和管理备份；确认恢复路径后再迁移物理网关。' },
  { repo: 'PowerDNS/pdns', stars: 4442, category: 'dns', role: '权威 DNS、递归解析器和 dnsdist 负载均衡组件的代码库。', start: '按角色只安装所需组件；用测试 zone/上游启动，验证 AXFR、递归边界、缓存和 API 鉴权。' },
  { repo: 'ktbyers/netmiko', stars: 4243, category: 'automation', role: '用 Python 简化多厂商网络设备 SSH 连接和命令执行。', start: '在虚拟环境安装 Netmiko，先对实验设备执行只读 show 命令；使用环境变量/密钥库保存凭据。' },
  { repo: 'FRRouting/frr', stars: 4240, category: 'automation', role: '开源路由协议套件，支持 BGP、OSPF、IS-IS、PIM、BFD 等。', start: '在容器/VM 启动最小两节点拓扑，先配置静态与单个动态协议；用 show 命令检查邻居和路由表。' },
  { repo: 'osrg/gobgp', stars: 4098, category: 'automation', role: 'Go 实现的 BGP 守护程序和库，提供 gRPC API，适合自动化控制。', start: '在隔离拓扑启动两个邻居，使用最小 TOML/YAML；通过 CLI 查看会话与 RIB 后再测试 API。' },
  { repo: 'openvswitch/ovs', stars: 4003, category: 'automation', role: '可编程虚拟交换机，常用于虚拟化、OpenFlow、OVN 和云网络。', start: '在 Linux VM 创建测试 bridge 和两个 namespace 端口；先验证二层互通，再学习流表和隧道。' },
  { repo: 'traviscross/mtr', stars: 3331, category: 'diagnosis', role: '把 ping 与 traceroute 结合，持续显示路径每一跳的延迟和丢包。', start: '对自有远端运行短时报告模式，多时段重复；不要仅凭中间跳丢包判断故障，要看后续跳是否恢复。' },
  { repo: 'k8snetworkplumbingwg/multus-cni', stars: 2926, category: 'kubernetes', role: 'CNI 元插件，使一个 Pod 可以连接多个网络接口。', start: '在测试集群保留主 CNI，安装 Multus 后创建一个 NetworkAttachmentDefinition 和测试 Pod 验证第二接口。' },
  { repo: 'srl-labs/containerlab', stars: 2725, category: 'automation', role: '用容器声明和运行多厂商网络实验拓扑，适合 CI 和配置验证。', start: '安装运行时和 containerlab，使用官方最小拓扑 `deploy`；实验结束执行 `destroy` 并保存拓扑文件。' },
  { repo: 'GNS3/gns3-gui', stars: 2603, category: 'automation', role: '图形化网络模拟器前端，可组合虚拟路由器、交换机、主机与抓包。', start: '安装官方桌面版与 VM，先用内置轻量节点建立两节点拓扑；第三方镜像必须确认许可证。' },
  { repo: 'containernetworking/plugins', stars: 2562, category: 'kubernetes', role: 'CNI 官方参考插件集合，包括 bridge、loopback、host-local、portmap 等。', start: '在测试机下载匹配架构的 release，配合 CNI 配置与临时 namespace 验证；避免手工替换集群插件目录。' },
  { repo: 'riba2534/TCP-IP-NetworkNote', stars: 2510, category: 'tutorial', role: '中文《TCP/IP 网络编程》学习笔记与 C 示例，适合套接字编程入门。', start: '按章节编译客户端/服务端示例，在 loopback 上运行；再用 Wireshark 对照握手与数据收发。' },
  { repo: 'cloudnativelabs/kube-router', stars: 2495, category: 'kubernetes', role: '集成 Pod 网络、NetworkPolicy 和 Service proxy 的 Kubernetes 网络方案。', start: '核对官方支持版本和所需内核模块；在新测试集群按 manifest 部署并运行连通性/策略测试。' },
  { repo: 'napalm-automation/napalm', stars: 2487, category: 'automation', role: '统一多厂商网络设备 API，支持配置获取、比较、合并和替换。', start: '安装目标厂商 extra，在实验设备调用 `get_facts`；再用 candidate config、compare 和 discard/commit 练习。' },
  { repo: 'kubeovn/kube-ovn', stars: 2376, category: 'kubernetes', role: '基于 OVN 的 Kubernetes 网络，支持子网、固定 IP、QoS、ACL 和双栈。', start: '只在新测试集群按官方安装脚本/Helm 部署；创建独立子网和测试工作负载验证策略与网关。' },
  { repo: 'antrea-io/antrea', stars: 1807, category: 'kubernetes', role: '基于 Open vSwitch 的 Kubernetes 网络与安全方案。', start: '用版本兼容表选择 release，在测试集群安装；运行 NetworkPolicy、Traceflow 和跨节点连通测试。' },
  { repo: 'loxilb-io/loxilb', stars: 1866, category: 'kubernetes', role: '基于 eBPF 的云原生负载均衡器，面向 Kubernetes、边缘和电信场景。', start: '先在官方支持的测试拓扑部署，创建一个示例 LoadBalancer Service；验证健康检查、故障切换和清理。' },
  { repo: 'sdnds-tw/awesome-sdn', stars: 1644, category: 'tutorial', role: 'SDN 论文、控制器、交换机、教程和工具的历史资料索引。', start: '按 OpenFlow、controller、data plane 分类查资料，并优先选择仍维护项目。', risk: '仓库已归档，只作为历史索引，不用于判断当前维护状态。' },
  { repo: 'nornir-automation/nornir', stars: 1608, category: 'automation', role: '面向网络设备集合的 Python 并发自动化框架，自带 inventory 模型。', start: '创建三台以内的测试 inventory，先运行只读任务；设置失败处理、并发上限和结构化结果输出。' },
  { repo: 'p4lang/tutorials', stars: 1582, category: 'tutorial', role: 'P4 可编程数据平面教程与练习，涵盖编译、交换机行为和控制面。', start: '使用项目推荐 VM/容器环境，从 basic exercise 开始；每次修改后运行测试脚本并观察包处理结果。' },
  { repo: 'nautobot/nautobot', stars: 1574, category: 'automation', role: '网络 Source of Truth 与自动化平台，支持应用、Jobs、API 和数据校验。', start: '用官方开发环境/容器启动，录入少量测试数据；编写只读 Job 后再测试审批式变更流程。' },
  { repo: 'feiskyer/sdn-handbook', stars: 1529, category: 'tutorial', role: '中文 SDN 指南，涵盖 OpenFlow、控制器、OVS、Mininet 和云网络。', start: '按目录先读体系结构，再在 Mininet/OVS 环境复现示例；遇到旧命令时对照当前项目文档。' },
  { repo: 'batfish/batfish', stars: 1447, category: 'automation', role: '离线分析网络配置和拓扑，可在变更前发现可达性、ACL、路由等问题。', start: '准备一组脱敏配置快照，用 PyBatfish 建 snapshot；先运行 parse status 和基础 reachability 查询。' },
  { repo: 'vyos/vyos-build', stars: 1296, category: 'automation', role: 'VyOS 网络操作系统镜像构建脚本，面向路由、防火墙和 VPN 实验。', start: '在官方支持的构建环境制作测试 ISO，先在 VM 验证接口、提交/回滚和配置备份。' },
  { repo: 'tonydeng/sdn-handbook', stars: 1260, category: 'tutorial', role: '另一份中文 SDN 手册，适合补充概念、OpenFlow 与控制器资料。', start: '以目录作知识地图，选一个 Mininet/OVS 实验复现；对旧链接和版本进行二次核验。' },
  { repo: 'ovn-kubernetes/ovn-kubernetes', stars: 1053, category: 'kubernetes', role: '基于 OVN/OVS 的 Kubernetes 网络平台，支持策略、网关和多种拓扑。', start: '使用项目提供的 kind 开发环境或新测试集群；跑 e2e 前先确认 OVS/内核依赖。' },
  { repo: 'eNMS-automation/eNMS', stars: 838, category: 'automation', role: '厂商无关的企业网络自动化平台，提供工作流、服务、计划和 Web UI。', start: '用官方容器部署测试实例，添加一台实验设备和只读服务；确认凭据加密与 RBAC 后再扩展。' },
  { repo: 'lukaszlach/docker-tc', stars: 758, category: 'automation', role: '通过容器标签模拟延迟、丢包、乱序、重复和限速，适合故障注入。', start: '只对测试容器添加小延迟标签，观察应用指标；逐步增加丢包并在实验后删除规则。' },
  { repo: 'KatharaFramework/Kathara', stars: 631, category: 'automation', role: '轻量容器式网络仿真系统，可构建路由、交换和协议实验。', start: '安装后运行官方最小 lab，进入节点检查接口和路由；用 `lclean` 清理实验资源。' },
  { repo: 'bregman-arie/computer-networking', stars: 437, category: 'tutorial', role: '面向自学者的网络课程、书籍、实验、认证和面试资料索引。', start: '先按 Fundamentals 选一门主课程，再用 labs 补实践；每周把概念转成一张拓扑和一次抓包。' },
  { repo: 'JarryShaw/PyPCAPKit', stars: 264, category: 'diagnosis', role: 'Python 报文捕获与协议分析库，适合程序化解析 pcap。', start: '在虚拟环境安装，先解析一份脱敏测试 pcap；只导出需要的协议字段并编写回归测试。' },
  { repo: 'bx33661/Wireshark-MCP', stars: 192, category: 'diagnosis', role: '把 tshark/pcap 分析封装为 MCP，让 AI 助手用自然语言辅助定位流量问题。', start: '在隔离环境安装 tshark 与 MCP 服务，仅投喂脱敏测试 pcap；核对 AI 结论对应的真实过滤器和包号。', risk: 'AI 解释不能替代协议证据，且不得上传含敏感数据的捕获文件。' },
  { repo: 'netboxlabs/netbox-learning', stars: 159, category: 'tutorial', role: 'NetBox 官方学习资源、演示与教程，适合从数据模型进入网络自动化。', start: '先完成 data model/IPAM 教程，再运行一个只读 API 示例；最后练习变更数据的审批和校验。' },
  { repo: 'KatharaFramework/Kathara-Labs', stars: 158, category: 'tutorial', role: 'Kathara 网络实验场景和教程集合，可直接练习协议与拓扑。', start: '先安装 Kathara，选择基础 lab 阅读目标后启动；完成后保存命令输出并清理实验。' },
  { repo: 'mattfenwick/cyclonus', stars: 125, category: 'kubernetes', role: '测量、理解和验证 Kubernetes NetworkPolicy 行为的工具。', start: '只在测试 namespace 运行，先保存现有策略；执行生成的连通性测试并对比预期允许/拒绝矩阵。' }
];

function repoLink(project) {
  return `[${project.repo}](https://github.com/${project.repo})`;
}

function formatStars(value) {
  return value.toLocaleString('en-US');
}

function frontmatter(tags, title) {
  return `---\ntags: [${tags.join(', ')}]\ntitle: ${title}\nupdated: 2026-08-09\n---\n\n`;
}

function projectSection(project) {
  const category = categories[project.category];
  return `### ${project.repo}\n\n- **GitHub**：${repoLink(project)}\n- **Star 快照**：${formatStars(project.stars)}\n- **作用**：${project.role}\n- **最短上手**：${project.start}\n- **如何验证**：${category.verify}\n- **注意**：${project.risk || category.caution}\n`;
}

function buildHome() {
  const rows = Object.entries(categories).map(([, category]) => {
    const count = projects.filter((project) => categories[project.category].file === category.file).length;
    return `| [[${category.file.replace(/\.md$/, '')}|${category.title}]] | ${count} |`;
  }).join('\n');

  return frontmatter(['github', '网络配置', '网络运维', '知识库'], 'GitHub 网络配置环境知识库') + [
    '# GitHub 网络配置环境知识库',
    '',
    `> 收录 ${projects.length} 个 GitHub 项目，Star 数据快照：${snapshot}。`,
    '> 这是高信号、可操作的广覆盖目录，不宣称穷尽 GitHub；GitHub 每分钟都可能新增、删除或改名仓库。',
    '',
    '## 按任务进入',
    '',
    '- 想系统学网络：[[02-网络基础与教程]]',
    '- 网络慢、丢包、服务不通、需要抓包：[[03-诊断抓包与监控]]',
    '- 批量配置设备、验证路由、搭实验拓扑：[[04-自动化路由与实验环境]]',
    '- 连接异地设备或建立私有覆盖网：[[05-VPN与异地组网]]',
    '- 发布内网服务、调试 HTTP、配置可信代理：[[06-代理反向代理与隧道]]',
    '- 自建解析、加密 DNS、过滤域名：[[07-DNS与域名管理]]',
    '- 配置 CNI、NetworkPolicy、集群 DNS：[[08-Kubernetes与容器网络]]',
    '',
    '## 导航',
    '',
    '| 页面 | 项目数 |',
    '|---|---:|',
    `| [[01-全部项目总榜|全部项目总榜（严格按 Star 降序）]] | ${projects.length} |`,
    rows,
    '| [[09-采集口径与安全清单|采集口径与安全清单]] | - |',
    '',
    '## 推荐学习顺序',
    '',
    '1. 先完成 TCP/IP、DNS、HTTP、路由与子网基础。',
    '2. 学会 curl、dig、iperf3、mtr、Nmap 和 Wireshark 的最小用法。',
    '3. 用 Mininet、Containerlab、GNS3 或 Kathara 建隔离实验环境。',
    '4. 再进入 Ansible、NetBox、Netmiko、NAPALM、Batfish 等自动化工具。',
    '5. 最后按实际需求选择 VPN、代理、DNS 或 Kubernetes CNI，避免为了“热门”增加系统复杂度。',
    '',
    '## 使用原则',
    '',
    '- Star 是关注度快照，不是安全、质量或合规认证。',
    '- 先读仓库 README、Releases、Security、License 和最近 Issues，再安装。',
    '- 所有网络改动都先备份；先在 VM、容器、实验路由器或非生产集群验证。',
    '- 代理、VPN、扫描、抓包仅限合法用途、本人资源或明确授权环境。',
    '- 不收录来源不明的“免费节点/订阅”、纯推广仓库、明显失真的关键词命中。',
    '',
    '---',
    '',
    `最后整理：${snapshot}`,
    ''
  ].join('\n');
}

function buildRanking() {
  const sorted = [...projects].sort((a, b) => b.stars - a.stars || a.repo.localeCompare(b.repo));
  const rows = sorted.map((project, index) => {
    const category = categories[project.category];
    return `| ${index + 1} | ${repoLink(project)} | ${formatStars(project.stars)} | [[${category.file.replace(/\.md$/, '')}|${category.title}]] | ${project.role.replace(/\|/g, '\\|')} |`;
  }).join('\n');
  return frontmatter(['github', '网络配置', '排行榜'], '全部项目总榜') + `# 全部项目总榜\n\n> 共 ${sorted.length} 个去重项目；按 ${snapshot} 的 GitHub Star 快照严格降序。\n> 同一项目只出现一次，详细操作请进入分类页。\n\n| 排名 | 项目 | Stars | 分类 | 主要作用 |\n|---:|---|---:|---|---|\n${rows}\n\n## 读榜提醒\n\n- 高 Star 的通用教程、客户端或老牌工具会自然排在前面，不代表最适合你的环境。\n- 低 Star 的专业项目（例如配置分析、MCP 抓包或策略测试）可能在特定场景更有效。\n- 已归档但仍有历史学习价值的项目会显式标注，不建议用于新生产部署。\n`;
}

function buildCategory(key) {
  const category = categories[key];
  const selected = projects.filter((project) => project.category === key).sort((a, b) => b.stars - a.stars);
  return frontmatter(['github', '网络配置', category.title.replace(/、|与/g, ', ')], category.title) + `# ${category.title}\n\n> 本页 ${selected.length} 个项目，按 Star 快照降序。返回 [[00-首页|知识库首页]] 或 [[01-全部项目总榜|总榜]]。\n\n## 本类统一验证原则\n\n- ${category.verify}\n- ${category.caution}\n\n${selected.map(projectSection).join('\n---\n\n')}\n`;
}

function buildMethodology() {
  return frontmatter(['github', '网络配置', '采集方法', '安全'], '采集口径与安全清单') + `# 采集口径与安全清单\n\n## 数据口径\n\n- **数据源**：GitHub REST API 仓库元数据与 GitHub Search。\n- **快照时间**：${snapshot}。\n- **排序字段**：仓库的 \`stargazers_count\`，即通常所说的 Star，不是 fork 或 Trending 日增。\n- **查询主题**：\`networking\`、\`network-automation\`、\`vpn\`、\`proxy\`、\`dns\`、\`packet-analysis\`、\`network-emulation\`、\`sdn\`、\`kubernetes-networking\`，并补查 Nmap、Wireshark、Ansible、OpenWrt、CNI 等基础项目。\n- **更新时间判断**：优先保留 2026-08 仍有仓库活动的项目；已归档项目仅在有明确历史教程价值时保留并标注。\n\n## 为什么不能声称“GitHub 上全部”\n\nGitHub 没有固定的“网络配置环境”分类，仓库会持续新增、删除、改名、转移或改变用途。关键词搜索也会同时漏报和误报。因此本库采用“多主题交叉搜索 + 基础项目补查 + 人工去噪”的广覆盖方法，并保留可复现口径。\n\n## 已排除内容\n\n- 来源不明的免费节点、订阅集合和账号分享。\n- 以推广、返佣、SEO 为主而没有可审查软件/教程主体的仓库。\n- 与网络配置无直接关系、只因 README 偶然出现关键词的项目。\n- 明显冒名、仓库用途已改变或元数据与历史项目不一致的条目。\n- 重复 fork、镜像和同一项目的容器镜像仓库（除非容器仓库本身是主要操作入口）。\n\n## 上线前检查\n\n- [ ] 阅读 README、安装文档、License、Security Policy、最近 Release 与 Issues。\n- [ ] 核对项目是否转移、归档或更换维护组织。\n- [ ] 下载 Release 时核对发布者、签名或哈希；不要运行不明一键脚本。\n- [ ] 保存当前配置、固件、路由表、DNS、ACL 和凭据备份。\n- [ ] 在隔离 VM/容器/实验设备/非生产集群完成最小验证。\n- [ ] 使用最小权限账户和短期凭据；管理面不直接暴露公网。\n- [ ] 明确健康检查、监控、日志、失败停止条件和回滚命令。\n- [ ] 抓包、扫描和代理测试已获得目标所有者明确授权。\n- [ ] pcap、日志、配置和 inventory 已脱敏，不含密码、Cookie、Token、私钥或真实客户数据。\n\n## 定期更新建议\n\n1. 每月重新查询项目元数据并更新 Star 快照。\n2. 对所有项目检查 \`archived\`、最后 Release、仓库转移和安全公告。\n3. 新增项目至少满足：用途明确、文档可用、不是推广/节点分享、能给出可验证的上手路径。\n4. 删除项目时记录原因，不因 Star 下降自动删除成熟工具。\n\n## 免责声明\n\n本库用于网络学习、系统管理、开发调试和经授权的安全测试。软件配置会影响连通性、安全和数据暴露；实施者应遵守所在地法律、服务条款和组织变更流程。\n`;
}

fs.mkdirSync(outputDir, { recursive: true });
const files = new Map([
  ['00-首页.md', buildHome()],
  ['01-全部项目总榜.md', buildRanking()],
  ['09-采集口径与安全清单.md', buildMethodology()]
]);
for (const key of Object.keys(categories)) {
  files.set(categories[key].file, buildCategory(key));
}
for (const [name, content] of files) {
  fs.writeFileSync(path.join(outputDir, name), content.replace(/\r?\n/g, '\r\n'), 'utf8');
}

const summary = {
  generatedAt: snapshot,
  projectCount: projects.length,
  categories: Object.fromEntries(Object.entries(categories).map(([key, value]) => [value.title, projects.filter((project) => project.category === key).length])),
  files: [...files.keys()]
};
fs.writeFileSync(path.join(outputDir, '_meta.json'), JSON.stringify(summary, null, 2), 'utf8');
console.log(JSON.stringify({ outputDir, ...summary }, null, 2));
