const express = require('express')//引入express模块，用来写后端代码
const cors = require('cors')//引入cors模块，允许前端访问后端
const dotenv = require('dotenv')//引入dotenv模块，用来读取环境变量
dotenv.config()//配置dotenv模块，读取.env文件

const app = express()//创建一个express应用

app.use(cors())//允许前端访问后端
app.use(express.json())//解析json请求体

async function askAI(message){//定义一个异步函数，用来调用AI API
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
            messages:[{role:'user',content:message}],
            stream:false
        })
    })
    const data = await response.json()
    const reply = data.choices[0].message.content
    return reply
}
app.post('/api',async (req,res)=>{
    // 打印前端传过来的完整请求体，方便检查 message 字段是否真的传到了后端。
    console.log('req.body =', req.body)
    
    // 从请求体中获取 message 字符串；如果没有拿到，就先给一个空字符串兜底，避免显示 undefined。
    const message = req.body?.message || ''
    try{
        res.json({
            reply:await askAI(message)//返回一条ai回复
        })
    }catch(error){
        res.status(500).json({
            reply: `AI 服务调用失败：${error.message}`
        })
    }
})
app.listen(3000,()=>{
    console.log(`后端运行在http://localhost:3000`)
})
//启动后端应用
