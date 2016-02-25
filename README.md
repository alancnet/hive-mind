# hive-mind
JavaScript hive-mind library for writing distributed computations naturally.

With hive-mind, there are two types of nodes:

 - Lazy node: This can be thought of as a master, but in reality, there is no such thing. 
 It's just the node that refuses to do any work. This would likely be your development machine, 
 since you'll want to horde those valuable CPU cycles for your UI. 
 - Worker node: These nodes connect to each other. They may begin by connecting to a "master node", 
 but then they broadcast their presence, and each node in turn connects directly to it. In this way, 
 every node has a direct connection to another node.
 
 There are some native messages that govern the actions between nodes:
 - Announce: This is the node's greeting that is sent when the node connects to another node. 
 This message is forwarded to all other already-connected nodes, and is ignored by nodes that are 
 already connected to the new guy. 
 
 `{ topic: 'Announce', source: 'a78bd10f', message: { ip: '123.45.6.78', port: '37110' } }`
 
 - Who can do: This is a node's request for help. The expectation is that most nodes will say "I can do" in response,
 but the originating node will just select the first one to do the work.
 
 `{ topic: 'Who can do', source: 'a78bd10f', message: { id: 998, library: 'myLibrary', version: '3.0.3', method: 'add' } }`
 
 - I can do: When a node has the library necessary to do the job, it responds that it can do it.
 
 `{ topic: 'I can do', source: '99c70233', target: 'a78bd10f', message: { id: 998, library: 'myLibrary', version: '3.0.3', method: 'add' } }`

 - You do: The originating node selects a node to do the work.

 `{ topic: 'You do', source: 'a78bd10f', target: '99c70233', { id: 998, library: 'myLibrary', version: '3.0.3', method: 'add', arguments: [ 1, 2 ] } }`

 - I did: The worker node responds with the result of the work.

 `{ topic: 'I did', source: '99c70233', target: 'a78bd10f', message: { id: 998, result: 3 } }`
 
 - Need library: As you see with the "Who can do" message, a job is based on a library. More specifically, 
 a node library. If the responding node doesn't have the library, it needs to ask for it. Not though NPM though, 
 but from other nodes. The advantage of this is not having to deploy to NPM to test the next iteration of your
 code. Just update the version in package.json, and you're good to go. 
 
 `{ topic: 'Need library', source: 'a78bd10f', message: { library: 'myLibrary', version: '3.0,3' } }`
 
 - I have library: When a node is able to provide said library, it will respond with this message. Many nodes may.
 
 `{ topic: 'I have library', source: '99c70233', target: 'a78bd10f', message: { library: 'myLibrary', version: '3.0.3' } }`
 
 - Send library: The node in need selects a node to respond to the message.
 
 `{ topic: 'Send library', source: 'a78bd10f', target: '99c70233', message: { library: 'myLibrary', version: '3.0.3' } }`
 
 - Here is library: The lucky node sends the library bits.
 
 `{ topic: 'Here is library', source: '99c70233', target: 'a78bd10f', message: { library: 'myLibrary', version: '3.0.3', gzipContent: "QSBidW5jaCBvZiB6aXBwZWQgdXAgamF2YXNjcmlwdCBmaWxlcw" } }`
 
 
