#!/usr/bin/env python3
# -*- coding: utf-8 -*-
'''
机场签到脚本 - ikuuu自动签到和流量查询
适用于青龙面板
使用方法：
1. 将此脚本添加到青龙面板的脚本目录
2. 设置环境变量或在脚本中直接配置账号密码
3. 安装依赖: pip install requests BeautifulSoup4
'''

import os
import re
import json
import time
import requests
from bs4 import BeautifulSoup
import traceback
from urllib.parse import urlparse, parse_qs

# 设置通知
try:
    from notify import send
except:
    # 如果没有通知模块，定义空函数
    def send(title, content):
        print(f'{title}\n{content}')

# 配置信息
class Config:
    # 登录地址
    LOGIN_URL = 'https://ikuuu.one/auth/login'
    # 签到地址
    CHECKIN_URL = 'https://ikuuu.one/user/checkin'
    # 用户中心地址
    USER_URL = 'https://ikuuu.one/user'
    # 网站基础域名
    BASE_URL = 'https://ikuuu.one'
    # 是否发送通知
    SEND_NOTIFY = True

# 获取环境变量中的账号密码，如没有则使用默认值
username = os.environ.get('IKUUU_USERNAME', 'shuye_886@163.com')
password = os.environ.get('IKUUU_PASSWORD', 'qwe123..')

# 请求头
headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36',
    'Content-Type': 'application/x-www-form-urlencoded',
    'Accept': 'application/json, text/javascript, */*; q=0.01',
    'X-Requested-With': 'XMLHttpRequest',
    'Referer': Config.BASE_URL
}

# 创建会话
session = requests.Session()
session.headers.update(headers)

def login():
    '''登录函数'''
    print(f'[ikuuu] 尝试登录账号: {username}')
    try:
        data = {
            'email': username,
            'passwd': password,
            'code': ''
        }
        
        response = session.post(Config.LOGIN_URL, data=data)
        result = response.json()
        
        if result.get('ret') == 1:
            print('[ikuuu] 登录成功')
            return True
        else:
            print(f'[ikuuu] 登录失败: {result.get("msg", "未知错误")}')
            return False
    except Exception as e:
        print(f'[ikuuu] 登录请求异常: {str(e)}')
        return False

def checkin():
    '''签到函数'''
    print('[ikuuu] 开始执行签到')
    try:
        response = session.post(Config.CHECKIN_URL)
        result = response.json()
        
        if result.get('ret') == 1:
            msg = result.get('msg', '签到成功')
            print(f'[ikuuu] 签到成功: {msg}')
            return {'success': True, 'message': msg}
        else:
            msg = result.get('msg', '签到失败')
            print(f'[ikuuu] 签到失败: {msg}')
            return {'success': False, 'message': msg}
    except Exception as e:
        error_msg = f'请求异常: {str(e)}'
        print(f'[ikuuu] 签到请求异常: {str(e)}')
        return {'success': False, 'message': error_msg}

def get_traffic_info():
    '''获取流量信息'''
    print('[ikuuu] 开始获取流量信息')
    try:
        response = session.get(Config.USER_URL)
        html = response.text
        
        # 使用BeautifulSoup解析HTML
        soup = BeautifulSoup(html, 'html.parser')
        
        # 尝试从页面中找到流量信息
        traffic_info = {}
        
        # 查找总流量信息
        total_traffic = None
        for span in soup.find_all('span'):
            if span.text.strip() and "GB" in span.text:
                total_traffic = span.text.strip()
                break
        
        if not total_traffic:
            # 尝试使用正则表达式查找
            total_match = re.search(r'(\d+(?:\.\d+)?\s*GB)', html)
            if total_match:
                total_traffic = total_match.group(1)
                
        traffic_info['total'] = total_traffic or '获取失败'
        
        # 查找今日已用流量
        used_today = None
        used_match = re.search(r'今日已用：\s*([0-9.]+\s*[B|KB|MB|GB|TB]*)', html)
        if used_match:
            used_today = used_match.group(1).strip()
        
        traffic_info['used'] = used_today or '0B'
        
        print(f'[ikuuu] 获取流量信息成功: 总计 {traffic_info["total"]}, 今日已用 {traffic_info["used"]}')
        return {'success': True, 'data': traffic_info}
    except Exception as e:
        error_msg = f'请求异常: {str(e)}'
        print(f'[ikuuu] 获取流量信息异常: {str(e)}')
        traceback.print_exc()
        return {'success': False, 'message': error_msg}

def main():
    '''主函数'''
    notify_msg = ''
    notify_title = 'ikuuu签到和流量查询'
    
    # 登录
    login_success = login()
    if not login_success:
        notify_msg = '[ikuuu] 登录失败，无法继续执行签到和查询流量'
        print(notify_msg)
        if Config.SEND_NOTIFY:
            send(notify_title, notify_msg)
        return
    
    # 签到
    checkin_result = checkin()
    if checkin_result['success']:
        notify_msg += f'[ikuuu] 签到成功: {checkin_result["message"]}\n'
    else:
        notify_msg += f'[ikuuu] 签到失败: {checkin_result["message"]}\n'
    
    # 获取流量信息
    traffic_result = get_traffic_info()
    if traffic_result['success']:
        notify_msg += f'[ikuuu] 流量信息: \n总计: {traffic_result["data"]["total"]}\n今日已用: {traffic_result["data"]["used"]}'
    else:
        notify_msg += f'[ikuuu] 获取流量信息失败: {traffic_result["message"]}'
    
    # 输出结果
    print(f'\n{notify_msg}')
    
    # 发送通知
    if Config.SEND_NOTIFY:
        send(notify_title, notify_msg)

if __name__ == '__main__':
    try:
        main()
    except Exception as e:
        error_msg = f'运行异常: {str(e)}'
        print(f'[ikuuu] {error_msg}')
        send('ikuuu签到', error_msg) 