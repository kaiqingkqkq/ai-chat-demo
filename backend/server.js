const express = require('express')//引入express模块，用来写后端代码
const cors = require('cors')//引入cors模块，允许前端访问后端
const dotenv = require('dotenv')//引入dotenv模块，用来读取环境变量
const crypto = require('crypto')//引入crypto模块，用来生成登录token
dotenv.config()//配置dotenv模块，读取.env文件

const app = express()//创建一个express应用

app.use(cors())//允许前端访问后端
app.use(express.json())//解析json请求体

const authEmail = process.env.AUTH_EMAIL || 'demo@example.com'
const authPassword = process.env.AUTH_PASSWORD || 'demo123456'

function createSessionToken() {
    return crypto.randomBytes(24).toString('hex')
}

function getStreamDelta(payload) {
    return payload.choices?.[0]?.delta?.content || ''
}

async function streamAI(messages, res){//定义一个异步函数，用来流式调用AI API
    const apiKey = process.env.AI_API_KEY//从环境变量中获取AI API Key
    if(!apiKey){
        throw new Error('缺少 AI_API_KEY,请先配置 backend/.env 文件')
    }
    if(!process.env.AI_API_URL){
        throw new Error('缺少 AI_API_URL,请先配置 backend/.env 文件')
    }
    const response = await fetch(process.env.AI_API_URL + '/chat/completions',{
        method:'POST',
        headers:{
            Authorization:`Bearer ${apiKey}`,
            'Content-Type':'application/json'
        },
        body:JSON.stringify({
            model:process.env.AI_MODEL,
            messages,
            stream:true
        })
    })

    if(!response.ok){
        const errorText = await response.text()
        throw new Error(errorText || `AI 服务返回 ${response.status}`)
    }

    const decoder = new TextDecoder()
    const reader = response.body.getReader()
    let buffer = ''

    while(true){
        const { done, value } = await reader.read()

        if(done){
            break
        }

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for(const line of lines){
            const trimmedLine = line.trim()

            if(!trimmedLine.startsWith('data:')){
                continue
            }

            const data = trimmedLine.slice(5).trim()

            if(data === '[DONE]'){
                return
            }

            try{
                const delta = getStreamDelta(JSON.parse(data))

                if(delta){
                    res.write(delta)
                }
            }catch(error){
                console.error('解析 AI 流式响应失败:', error)
            }
        }
    }
}
app.post('/api',async (req,res)=>{
    // 打印前端传过来的完整请求体，方便检查 message 字段是否真的传到了后端。
    console.log('req.body =', req.body)
    
    // 从请求体中获取 messages 数组；如果没有拿到，就先给一个空数组兜底，避免显示 undefined。
    const messages = Array.isArray(req.body?.messages)
    ? req.body.messages
    : [{ role: 'user', content: req.body?.message || '' }]

    try{
        res.setHeader('Content-Type', 'text/plain; charset=utf-8')
        res.setHeader('Cache-Control', 'no-cache')
        res.setHeader('X-Accel-Buffering', 'no')
        await streamAI(messages, res)//返回流式ai回复
        res.end()
    }catch(error){
        if(!res.headersSent){
            res.status(500).json({
                reply: `AI 服务调用失败：${error.message}`
            })
            return
        }

        res.write(`\n\nAI 服务调用失败：${error.message}`)
        res.end()
    }
})
app.post('/api/login',(req,res)=>{
    const { email, password } = req.body || {}

    if(!email || !password){
        res.status(400).json({
            message:'请输入邮箱和密码'
        })
        return
    }

    if(email !== authEmail || password !== authPassword){
        res.status(401).json({
            message:'邮箱或密码错误'
        })
        return
    }

    res.json({
        message:'登录成功',
        token:createSessionToken(),
        user:{
            email
        }
    })
})
app.listen(3000,()=>{
    console.log(`后端运行在http://localhost:3000`)
})
//启动后端应用
