// 机场签到脚本 - ikuuu自动签到和流量查询 (青龙兼容版)
// 使用方法：
// 1. 将此脚本添加到青龙面板的脚本目录
// 2. 设置环境变量或在脚本中直接配置账号密码
//    多账户设置方式: 使用&或者换行符分隔多个账号和密码
//    例如: IKUUU_USERNAME=account1&account2 IKUUU_PASSWORD=pwd1&pwd2
// 3. 安装依赖: npm install got

const got = require('got');

// 青龙通知兼容处理
let sendNotify;
try {
    sendNotify = require('./sendNotify').sendNotify;
} catch (err) {
    sendNotify = async (title, content) => {
        console.log(`\n${title}\n${content}`);
    };
}

// 配置信息
const config = {
    // 站点信息
    loginUrl: 'https://ikuuu.one/auth/login',
    checkinUrl: 'https://ikuuu.one/user/checkin',
    userUrl: 'https://ikuuu.one/user',
    baseUrl: 'https://ikuuu.one'
};

// 获取环境变量中的账号密码列表
function getAccountList() {
    const usernames = process.env.IKUUU_USERNAME || 'shuye_886@163.com';
    const passwords = process.env.IKUUU_PASSWORD || 'qwe123..';
    
    // 支持使用&或者换行符分隔多个账号
    const usernameList = usernames.split(/[&\n]/).map(item => item.trim()).filter(Boolean);
    const passwordList = passwords.split(/[&\n]/).map(item => item.trim()).filter(Boolean);
    
    const result = [];
    
    for (let i = 0; i < usernameList.length; i++) {
        result.push({
            username: usernameList[i],
            password: passwordList[i] || passwordList[passwordList.length - 1] // 如果密码不够，使用最后一个密码
        });
    }
    
    return result;
}

// 创建请求会话
function createSession() {
    return got.extend({
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36',
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json, text/javascript, */*; q=0.01',
            'X-Requested-With': 'XMLHttpRequest',
            'Referer': config.baseUrl
        },
        followRedirect: true,
        retry: { limit: 2 },
        cookieJar: new (require('tough-cookie')).CookieJar()
    });
}

// 提取HTML中的文本信息
function extractInfo(html, regex, defaultValue = '获取失败') {
    const match = html.match(regex);
    return match && match[1] ? match[1].trim() : defaultValue;
}

// 处理单个账号
async function processAccount(account) {
    console.log(`\n🔄 开始处理账号: ${account.username}`);
    let result = {
        success: false,
        username: account.username,
        message: '',
        checkinResult: null,
        userInfo: null
    };
    
    // 每个账号使用独立的会话
    const session = createSession();
    
    try {
        // 1. 登录
        console.log(`尝试登录账号: ${account.username}`);
        const loginRes = await session.post(config.loginUrl, {
            form: {
                email: account.username,
                passwd: account.password,
                code: ''
            }
        }).json();
        
        if (loginRes.ret !== 1) {
            result.message = `❌ 登录失败: ${loginRes.msg || '未知错误'}`;
            console.log(result.message);
            return result;
        }
        
        console.log('✅ 登录成功');
        result.success = true;
        
        // 2. 签到
        console.log('开始签到');
        const checkinRes = await session.post(config.checkinUrl).json();
        
        if (checkinRes.ret === 1) {
            result.checkinResult = {
                success: true,
                message: checkinRes.msg
            };
            console.log(`✅ 签到成功: ${checkinRes.msg}`);
        } else {
            result.checkinResult = {
                success: false,
                message: checkinRes.msg
            };
            console.log(`❌ 签到失败: ${checkinRes.msg}`);
        }
        
        // 3. 获取用户信息
        console.log('获取用户信息');
        const userRes = await session.get(config.userUrl);
        const html = userRes.body;
        
        // 初始化用户信息
        result.userInfo = {
            traffic: {
                total: '获取失败',
                used: '0B'
            },
            account: {
                memberType: '获取失败',
                deviceCount: '获取失败',
                balance: '获取失败'
            }
        };
        
        // 提取流量信息
        const totalMatch = html.match(/([0-9.]+)\s*GB/);
        if (totalMatch && totalMatch[1]) {
            result.userInfo.traffic.total = `${totalMatch[1]} GB`;
        }
        
        // 提取今日已用流量
        const usedMatch = html.match(/今日已用：\s*([0-9.]+\s*[B|KB|MB|GB|TB]*)/i);
        if (usedMatch && usedMatch[1]) {
            result.userInfo.traffic.used = usedMatch[1].trim();
        }
        
        // 提取会员类型信息
        const membershipMatch = html.match(/会员时长[\s\S]*?<\/div>[\s\S]*?<div[^>]*>([^<]*永久[^<]*)<\/div>/i) || 
                              html.match(/永久\s*\(免费版\)/) || 
                              html.match(/会员时长[\s\S]*?<div[^>]*>(.*?)<\/div>/i);
        if (membershipMatch) {
            result.userInfo.account.memberType = membershipMatch[1].trim();
        } else if (html.includes('永久') || html.includes('免费版')) {
            result.userInfo.account.memberType = '永久 (免费版)';
        }
        
        // 提取在线设备数 - 优化提取方法
        // 尝试多种模式匹配
        let deviceCount = null;
        
        // 模式1: 直接包含"在线设备数"附近的数字/数字
        const devicePattern1 = /在线设备数[^>]*>\s*<[^>]*>\s*(\d+)\s*\/\s*(\d+)/i;
        const deviceMatch1 = html.match(devicePattern1);
        
        // 模式2: 在页面中寻找格式为"数字/数字"的部分
        const devicePattern2 = /(?:在线设备|devices)[\s\S]{1,100}?(\d+)\s*\/\s*(\d+)/i;
        const deviceMatch2 = html.match(devicePattern2);
        
        // 模式3: 在页面中找所有的"数字/数字"格式
        const devicePattern3 = /(\d+)\s*\/\s*(\d+)/g;
        const allDeviceMatches = [...html.matchAll(devicePattern3)];
        
        if (deviceMatch1) {
            deviceCount = `${deviceMatch1[1]}/${deviceMatch1[2]}`;
        } else if (deviceMatch2) {
            deviceCount = `${deviceMatch2[1]}/${deviceMatch2[2]}`;
        } else if (allDeviceMatches.length > 0) {
            // 通常设备数量格式是0/5或类似格式
            for (const match of allDeviceMatches) {
                // 如果第二个数字是5，很可能是设备数量限制
                if (match[2] === '5') {
                    deviceCount = `${match[1]}/${match[2]}`;
                    break;
                }
            }
            
            // 如果没找到5作为上限的，使用第一个匹配
            if (!deviceCount && allDeviceMatches.length > 0) {
                const firstMatch = allDeviceMatches[0];
                deviceCount = `${firstMatch[1]}/${firstMatch[2]}`;
            }
        }
        
        result.userInfo.account.deviceCount = deviceCount || '获取失败';
        
        // 提取钱包余额
        const balanceMatch = html.match(/钱包余额[^>]*>[^<]*?¥\s*(\d+(\.\d+)?)/i) || 
                          html.match(/¥\s*(\d+(\.\d+)?)/);
        if (balanceMatch) {
            result.userInfo.account.balance = `¥${balanceMatch[1].trim()}`;
        } else if (html.includes('¥0') || html.includes('¥ 0')) {
            result.userInfo.account.balance = '¥0';
        }
        
        console.log(`✅ 获取用户信息成功`);
        
    } catch (error) {
        console.log(`❌ 处理账号异常: ${error.message || error}`);
        result.message = `处理异常: ${error.message || error}`;
    }
    
    return result;
}

// 主函数
async function main() {
    console.log('🚀 ikuuu 签到任务开始');
    const accounts = getAccountList();
    console.log(`共发现 ${accounts.length} 个账号`);
    
    const results = [];
    const allMessages = [];
    
    // 依次处理每个账号
    for (let i = 0; i < accounts.length; i++) {
        const result = await processAccount(accounts[i]);
        results.push(result);
        
        // 构建该账号的消息
        let accountMsg = `\n============ 账号 ${i+1} ============\n`;
        accountMsg += `账号: ${result.username}\n`;
        
        if (!result.success) {
            accountMsg += result.message;
            allMessages.push(accountMsg);
            continue;
        }
        
        // 签到结果
        if (result.checkinResult) {
            if (result.checkinResult.success) {
                accountMsg += `✅ 签到成功: ${result.checkinResult.message}\n\n`;
            } else {
                accountMsg += `❌ 签到失败: ${result.checkinResult.message}\n\n`;
            }
        }
        
        // 用户信息
        if (result.userInfo) {
            accountMsg += `👑 账户信息:\n`;
            accountMsg += `- 会员类型: ${result.userInfo.account.memberType}\n`;
            accountMsg += `- 在线设备: ${result.userInfo.account.deviceCount}\n`;
            accountMsg += `- 钱包余额: ${result.userInfo.account.balance}\n\n`;
            
            accountMsg += `📊 流量信息:\n`;
            accountMsg += `- 总流量: ${result.userInfo.traffic.total}\n`;
            accountMsg += `- 今日已用: ${result.userInfo.traffic.used}`;
        }
        
        allMessages.push(accountMsg);
    }
    
    // 合并所有账号消息
    const finalMessage = allMessages.join('\n');
    console.log(finalMessage);
    
    // 发送通知
    await sendNotify('ikuuu多账户签到结果', finalMessage);
}

// 执行主函数
main().catch(error => {
    console.log(`❌ 运行异常: ${error}`);
    sendNotify('ikuuu签到异常', `运行时发生错误: ${error}`);
}); 