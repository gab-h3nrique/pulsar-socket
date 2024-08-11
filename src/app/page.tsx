'use client'

import Image from "next/image";

import React, { useEffect, useRef, useState } from 'react'

export default function Home() {


  // const [ messageList, setMessageList ] = useState<string[]>([ 'hehehe', 'kkk' ])

  // const [ message, setMessage ] = useState('')


  function connect() {

    let webSocket = new WebSocket("ws://localhost:3000")

    // Connection opened
    webSocket.addEventListener("open", event => {
      console.log('connecting', event)
    });
  
    // Listen for messages
    webSocket.addEventListener("message", event => {
      console.log("Message from server ", event.data)
    });

    webSocket.send('hehehehehhee')


  }

  function send() {
 
    console.log('sending...f')

  }
  


  return (
    
    <main className="w-screen h-screen bg-black flex flex-col">

      {/* <section className="p-2 gap-2 w-full h-full flex flex-col justify-end">
        {messageList.map((e, i) => (
          <article key={i} className="p-2 w-fit border-2 border-white rounded-lg">
            {e}
          </article>
        ))}
      </section> */}
      
      <section className="flex p-2 gap-2 w-full h-fit">
        {/* <input onChange={e => setMessage(e.target.value)} value={message} className="p-2 px-4 w-full border-2 bg-slate-950 border-white rounded-lg"></input> */}
        <button onClick={connect} className="p-2 px-4 w-fit border-2 border-white rounded-lg">Connect</button>
        <button onClick={send} className="p-2 px-4 w-fit border-2 border-white rounded-lg">Send</button>
      </section>

    </main>

  )


}
