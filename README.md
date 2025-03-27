# ikuuu 签到和流量查询脚本

这是一个适用于青龙面板的 ikuuu VPN 自动签到和流量查询脚本。本仓库提供了三个版本的脚本：

- `ikuuu_signin.js` (JavaScript 完整版本)
- `ikuuu_signin_qinglong.js` (JavaScript 精简版，更兼容青龙面板)
- `ikuuu_signin.py` (Python 版本)

您可以根据自己的偏好选择其中一个使用。

## 功能特点

- 🔄 自动登录 ikuuu VPN 账户
- ✅ 执行每日签到（如图1红框所示）
- 📊 查询剩余流量信息（如图2红框所示）
- 👑 显示会员类型信息（如图1红框所示）
- 📱 显示在线设备数量（如图3红框所示）
- 💰 显示钱包余额信息（如图4红框所示）
- 📱 支持青龙面板消息通知
- 👥 支持多账户配置（2023-11-05新增）

## 使用方法

### 1. 添加脚本到青龙面板

将您选择的脚本文件上传到青龙面板的脚本目录中。

### 2. 安装依赖

根据您选择的脚本版本，安装相应的依赖：

对于 JavaScript 版本：
```bash
npm install got crypto-js
```

对于 JavaScript 精简版：
```bash
npm install got
```

对于 Python 版本：
```bash
pip install requests BeautifulSoup4
```

### 3. 设置环境变量

在青龙面板中添加以下环境变量：

| 变量名 | 说明 | 默认值 |
| --- | --- | --- |
| IKUUU_USERNAME | ikuuu 账号 | shuye_886@163.com |
| IKUUU_PASSWORD | ikuuu 密码 | qwe123.. |

如果您不设置这些环境变量，脚本将使用默认值。

#### 多账户配置方法

如果您需要配置多个账号，有以下几种方式：

1. **使用 & 分隔符**:
   ```
   IKUUU_USERNAME=account1@example.com&account2@example.com
   IKUUU_PASSWORD=password1&password2
   ```

2. **使用换行符分隔**:
   ```
   IKUUU_USERNAME=account1@example.com
   account2@example.com
   IKUUU_PASSWORD=password1
   password2
   ```

3. **密码复用**：如果多个账号使用相同的密码，可以只设置一个密码：
   ```
   IKUUU_USERNAME=account1@example.com&account2@example.com
   IKUUU_PASSWORD=same_password
   ```

### 4. 创建定时任务

在青龙面板中创建定时任务，建议每天执行一次：

```
5 9 * * * ikuuu_signin_qinglong.js
```

或者选择您喜欢的其他版本：

```
5 9 * * * ikuuu_signin.js
```

```
5 9 * * * ikuuu_signin.py
```

## 通知功能

脚本执行后将发送通知，包含以下信息：
- 签到结果（成功/失败）
- 会员类型信息
- 在线设备数量
- 钱包余额
- 总流量信息
- 今日已用流量

对于多账户配置，通知会按账号分组显示。

## 不同版本说明

1. `ikuuu_signin.js` - 完整版本，包含详细日志和错误处理
2. `ikuuu_signin_qinglong.js` - 精简版本，针对青龙面板优化，代码更简洁
3. `ikuuu_signin.py` - Python 版本，适合偏好 Python 的用户

## 注意事项

- 如果您的账号有验证码，可能无法自动登录
- 如果网站结构发生变化，脚本可能需要更新
- 请妥善保管您的账号密码信息
- 如果在线设备数显示不正确，已在最新版本中优化提取算法

## 更新日志

- 2023-10-31：初始版本发布，支持 ikuuu 自动签到和流量查询
- 2023-11-01：添加会员类型、在线设备数和钱包余额显示功能
- 2023-11-05：添加多账户支持，优化在线设备数获取算法

## 免责声明

本脚本仅供学习和研究使用，请勿用于商业或非法用途。使用本脚本造成的任何问题与作者无关。 