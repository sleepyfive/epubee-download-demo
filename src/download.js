const axios = require('axios').default
const fs = require('fs')

const rootPath = 'epub/'
let bookPath = ''

function mkDir(path){
    if (!fs.existsSync(path)) {
        fs.mkdirSync(path)
      } 
}

function urlPath(url){
    return url.replace('http://reader.epubee.com','')
}

function deleteMenu(data){
    
    const content_prefix = `<div class="readercontent"><div class="readercontent-inner">`
    const content_suffix = `</div></div></div>`
    const content_start_index = data.indexOf(content_prefix)+content_prefix.length
    const content_end_index = data.lastIndexOf(content_suffix)

    const head_prefix = `<head>`
    const head_suffix = `<script`
    const head_start_index = data.indexOf(head_prefix)+head_prefix.length
    const head_end_index = data.indexOf(head_suffix)
    
    const htmlContent = `<html>
    <head>
    ${data.substring(head_start_index,head_end_index)}
    </head>
    <body>
    ${data.substring(content_start_index,content_end_index)}
    </body>
    </html>
    `
    return htmlContent
}

function dirPath(path){
    let arr = path.split('/')
    arr = arr.slice(0,arr.length-1)
    let p = rootPath+bookPath
    for(let it of arr){
        if(!fs.existsSync(p+'/'+it)){
            fs.mkdirSync(p+'/'+it)
        }
        p = p+'/'+it
    }
}

async function download(url){
    const urlPattern = new RegExp(urlPath(url),'g')

    const content_opf = `${url}content.opf`
    console.log(`downloading ${content_opf}`)
    const opf_rep =  await axios.get(content_opf,{
    })
    const name = resolveBookName(opf_rep.data)
    bookPath = name+'/'
    mkDir(rootPath+bookPath)
    saveFile('content.opf',opf_rep.data)
    generateConstFile()
    const targets = resolveContentOPF(opf_rep.data)
    for(let it of targets){
        const name = url+it
        let content
        console.log(`downloading ${name}`)
        if(it.endsWith('html')){
            content =  await axios.get(name,{})
            content.data = content.data.replace(urlPattern,'')
            saveFile(it,deleteMenu(content.data))
        }else{
            content =  await axios.get(name,{
                responseType: 'arraybuffer'
            })
            saveFile(it,content.data)
        }
        
    }
}

function resolveContentOPF(data){
    const targetList = new Set()
    const itemPattern = /href=\"(.*?)\"/g
    let arr 
    while((arr = itemPattern.exec(data))!==null){
        targetList.add(arr[1])
    }
    return targetList
}

function inputURL(handler){
    let url = ''
    console.log(`please input url like: http://reader.epubee.com/books/mobile/5f/5f80cfe69440056dc623f051c2f76246/
q to quit`)
    //*监听控制台输入
    process.stdin.on('data',function(data){
        const str = data.toString().trim()
        if(str==='q') process.exit(0)
        if(str.length!==74){
            console.log(`please input url like: http://reader.epubee.com/books/mobile/5f/5f80cfe69440056dc623f051c2f76246/
q to quit`) 
        }else{
            url = str
            //*结束监听
            process.stdin.emit('end')
            handler(url)
        }
    })
}

function saveFile(path,content){
    dirPath(path)
    fs.writeFile(rootPath+bookPath+path,content,err=>{
        if(err){
            console.log(`创建${path}文件失败`,err)
            process.exit(-1)
        }
        
    })
}

function generateConstFile(){
    const mimeContent = 'application/epub+zip'
    saveFile('mimetype',mimeContent)

    const containerContent = `<?xml version="1.0"?>
    <container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
       <rootfiles>
          <rootfile full-path="content.opf" media-type="application/oebps-package+xml"/>
       </rootfiles>
    </container>
    `    
    mkDir(rootPath+bookPath+'META-INF')
    saveFile('META-INF/container.xml',containerContent)

}

function resolveBookName(data){
    const ans = /<dc:title>(.*?)<\/dc:title>/.exec(data)
    return ans[1]||`default${Date.now()}`
}


function main(url){
    mkDir(rootPath)
    download(url)
}

inputURL(main)

