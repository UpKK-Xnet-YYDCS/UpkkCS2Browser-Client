# Discuz X3.5 OAuth2 Server Plugin

让你的 Discuz! X3.5 论坛变成 OAuth2 授权服务器，其他应用（网站、App、小程序等）可以通过本插件接入论坛账号登录。

A Discuz X3.5 plugin that turns your forum into an OAuth2 authorization server. External applications can authenticate users via their Discuz forum accounts using the standard OAuth2 Authorization Code Grant flow.

---

## 功能特性 / Features

- 标准 OAuth2 Authorization Code Grant 流程
- 后台管理界面：添加、编辑、删除 OAuth2 客户端
- 自动生成 `client_id` 和 `client_secret`
- 支持多个 redirect_uri（每行一个）
- Bearer Token 用户信息接口
- 安全的随机 token 生成（使用 `random_bytes`）

---

## 安装说明 / Installation

1. 将 `source/plugin/oauth2app` 目录复制到 Discuz X3.5 的 `source/plugin/` 目录下
2. 登录 Discuz 管理后台
3. 进入 **应用 > 插件**，找到 **OAuth2 Server**
4. 点击 **导入** 选择 XML 文件安装，或直接点击 **安装**
5. 安装后点击 **启用**
6. 点击插件名旁边的 **Settings** 进入管理页面，添加 OAuth2 客户端

> 安装时会自动创建 3 张数据表：`oauth2_clients`、`oauth2_authorization_codes`、`oauth2_access_tokens`

---

## 后台设置 / Admin Settings

启用插件后，进入 **应用 > 插件 > OAuth2 Server**，点击 **Settings** 标签进入管理页面。

你可以在此页面：
- **添加客户端**：输入应用名称和回调地址，系统自动生成 `client_id` 和 `client_secret`
- **编辑客户端**：修改应用名称和回调地址
- **重新生成密钥**：重新生成 `client_secret`（旧密钥立即失效）
- **删除客户端**：删除客户端及其所有关联的授权码和令牌

---

## 接入说明 / Integration Guide

### API 端点 / Endpoints

将 `https://bbs.upkk.com.com` 替换为你的论坛实际地址：

| 端点 | URL | 方法 |
|------|-----|------|
| 授权 Authorize | `https://bbs.upkk.com.com/plugin.php?id=oauth2app&action=authorize` | GET |
| 令牌 Token | `https://bbs.upkk.com.com/plugin.php?id=oauth2app&action=token` | POST |
| 用户信息 UserInfo | `https://bbs.upkk.com.com/plugin.php?id=oauth2app&action=userinfo` | GET |

---

### 完整接入流程 / Full OAuth2 Flow

#### 第 1 步：获取授权码 (Authorization Code)

在你的应用中，将用户重定向到论坛的授权页面：

```
https://bbs.upkk.com.com/plugin.php?id=oauth2app&action=authorize
  &client_id=YOUR_CLIENT_ID
  &redirect_uri=https://yourapp.com/callback
  &response_type=code
  &state=RANDOM_STATE_STRING
```

| 参数 | 必填 | 说明 |
|------|------|------|
| `client_id` | 是 | 后台添加客户端后获得的 Client ID |
| `redirect_uri` | 否 | 回调地址，必须与后台配置的一致。省略则使用第一个已注册的 URI |
| `response_type` | 是 | 固定值 `code` |
| `state` | 推荐 | 随机字符串，用于防止 CSRF 攻击，会原样返回 |

如果用户未登录，会先跳转到论坛登录页面，登录后返回授权页面。

用户同意授权后，浏览器跳转到：

```
https://yourapp.com/callback?code=AUTHORIZATION_CODE&state=RANDOM_STATE_STRING
```

用户拒绝授权：

```
https://yourapp.com/callback?error=access_denied&error_description=The+user+denied+the+request.&state=RANDOM_STATE_STRING
```

---

#### 第 2 步：用授权码换取 Access Token

在你的服务器端 POST 请求令牌端点：

```http
POST /plugin.php?id=oauth2app&action=token HTTP/1.1
Host: bbs.upkk.com.com
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code&code=AUTHORIZATION_CODE&client_id=YOUR_CLIENT_ID&client_secret=YOUR_CLIENT_SECRET&redirect_uri=https://yourapp.com/callback
```

也支持 HTTP Basic Auth 传递客户端凭据：

```http
POST /plugin.php?id=oauth2app&action=token HTTP/1.1
Host: bbs.upkk.com.com
Authorization: Basic BASE64(client_id:client_secret)
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code&code=AUTHORIZATION_CODE&redirect_uri=https://yourapp.com/callback
```

| 参数 | 必填 | 说明 |
|------|------|------|
| `grant_type` | 是 | 固定值 `authorization_code` |
| `code` | 是 | 第 1 步获得的授权码（10 分钟内有效，只能使用一次） |
| `client_id` | 是 | Client ID（也可通过 Basic Auth 传递） |
| `client_secret` | 是 | Client Secret（也可通过 Basic Auth 传递） |
| `redirect_uri` | 否 | 如果第 1 步传了 redirect_uri，这里必须一致 |

**成功响应：**

```json
{
  "access_token": "a1b2c3d4e5f6...",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

**错误响应：**

```json
{
  "error": "invalid_grant",
  "error_description": "Authorization code has expired."
}
```

---

#### 第 3 步：获取用户信息

使用 Access Token 请求用户信息：

```http
GET /plugin.php?id=oauth2app&action=userinfo HTTP/1.1
Host: bbs.upkk.com.com
Authorization: Bearer YOUR_ACCESS_TOKEN
```

或通过查询参数传递 token：

```
https://bbs.upkk.com.com/plugin.php?id=oauth2app&action=userinfo&access_token=YOUR_ACCESS_TOKEN
```

**成功响应：**

```json
{
  "uid": 1,
  "username": "admin",
  "email": "admin@example.com",
  "steamid": "76561198012345678"
}
```

> `steamid` 字段来自 `steam_users` 表的 `steamID64`，如果用户未绑定 Steam 则返回空字符串 `""`。

**错误响应（token 无效或过期）：**

```json
{
  "error": "invalid_token",
  "error_description": "The access token has expired."
}
```

---

### 代码示例 / Code Examples

#### PHP 示例

```php
<?php
// 第 1 步：生成授权链接，放在你的登录按钮上
$client_id = 'your_client_id';
$redirect_uri = 'https://yourapp.com/callback';
$state = bin2hex(random_bytes(16));
$_SESSION['oauth_state'] = $state;

$auth_url = 'https://bbs.upkk.com.com/plugin.php?id=oauth2app&action=authorize'
    . '&client_id=' . urlencode($client_id)
    . '&redirect_uri=' . urlencode($redirect_uri)
    . '&response_type=code'
    . '&state=' . urlencode($state);

// 跳转用户到论坛授权
header('Location: ' . $auth_url);
exit;
```

```php
<?php
// 第 2 步：回调页面 (callback.php)
// 验证 state
if (!isset($_GET['state']) || $_GET['state'] !== $_SESSION['oauth_state']) {
    die('Invalid state');
}

// 用授权码换 access_token
$response = file_get_contents('https://bbs.upkk.com.com/plugin.php?id=oauth2app&action=token', false,
    stream_context_create(['http' => [
        'method' => 'POST',
        'header' => 'Content-Type: application/x-www-form-urlencoded',
        'content' => http_build_query([
            'grant_type'    => 'authorization_code',
            'code'          => $_GET['code'],
            'client_id'     => 'your_client_id',
            'client_secret' => 'your_client_secret',
            'redirect_uri'  => 'https://yourapp.com/callback',
        ]),
    ]])
);
$token = json_decode($response, true);

// 第 3 步：获取用户信息
$userinfo = file_get_contents('https://bbs.upkk.com.com/plugin.php?id=oauth2app&action=userinfo', false,
    stream_context_create(['http' => [
        'header' => 'Authorization: Bearer ' . $token['access_token'],
    ]])
);
$user = json_decode($userinfo, true);

echo 'Welcome, ' . $user['username'] . '! (UID: ' . $user['uid'] . ')';
```

#### Python 示例

```python
import requests

# 第 2 步：用授权码换 access_token
token_resp = requests.post('https://bbs.upkk.com.com/plugin.php?id=oauth2app&action=token', data={
    'grant_type':    'authorization_code',
    'code':          'AUTHORIZATION_CODE',
    'client_id':     'your_client_id',
    'client_secret': 'your_client_secret',
    'redirect_uri':  'https://yourapp.com/callback',
})
token = token_resp.json()

# 第 3 步：获取用户信息
user_resp = requests.get('https://bbs.upkk.com.com/plugin.php?id=oauth2app&action=userinfo',
    headers={'Authorization': f'Bearer {token["access_token"]}'}
)
user = user_resp.json()
print(f'UID: {user["uid"]}, Username: {user["username"]}')
```

#### JavaScript (Node.js) 示例

```javascript
// 第 2 步：用授权码换 access_token
const tokenResp = await fetch('https://bbs.upkk.com.com/plugin.php?id=oauth2app&action=token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    grant_type:    'authorization_code',
    code:          'AUTHORIZATION_CODE',
    client_id:     'your_client_id',
    client_secret: 'your_client_secret',
    redirect_uri:  'https://yourapp.com/callback',
  }),
});
const token = await tokenResp.json();

// 第 3 步：获取用户信息
const userResp = await fetch('https://bbs.upkk.com.com/plugin.php?id=oauth2app&action=userinfo', {
  headers: { 'Authorization': `Bearer ${token.access_token}` },
});
const user = await userResp.json();
console.log(`UID: ${user.uid}, Username: ${user.username}`);
```

---

### 错误码说明 / Error Codes

| 错误码 | 说明 |
|--------|------|
| `invalid_request` | 缺少必填参数或参数格式错误 |
| `invalid_client` | client_id 不存在或 client_secret 错误 |
| `invalid_grant` | 授权码无效、已过期或已使用 |
| `unsupported_response_type` | response_type 不支持（仅支持 `code`） |
| `unsupported_grant_type` | grant_type 不支持（仅支持 `authorization_code`） |
| `access_denied` | 用户拒绝了授权请求 |
| `invalid_token` | Access Token 无效或已过期 |

---

## 安全说明 / Security Notes

- Authorization Code 有效期 10 分钟，只能使用一次
- Access Token 有效期 1 小时
- `client_secret` 使用 timing-safe 比较防止时序攻击
- `redirect_uri` 使用精确匹配验证
- 所有 token 使用 `random_bytes` 加密安全随机生成
- 过期的授权码和令牌会在使用时自动清理

---

## 系统要求 / Requirements

- Discuz! X3.5
- PHP 7.0+
- MySQL 5.6+

## License

MIT License
