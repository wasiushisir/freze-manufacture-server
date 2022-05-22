const express = require('express');
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion } = require('mongodb');
const cors = require('cors');
require('dotenv').config()
const app=express();
const port=process.env.PORT || 5000

//middleware
app.use(cors())
app.use(express.json())



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.cghyb.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

  async function run(){

    try{
        await client.connect();
        const userCollection=client.db('freeze').collection('user');

        app.put('/user/:email',async(req,res)=>{
          const email=req.params.email;
          const user=req.body
          const filter={email:email}
          const options = { upsert: true };

          const updateDoc={
            $set:user
          }

          const result=await userCollection.updateOne(filter, updateDoc, options);
          const token=jwt.sign({
            email: email
          }, process.env.ACCESS_TOKEN_SECRETE, { expiresIn: '1h' });

          res.send({result,token})

        })

    }

    finally{

    }



  }

  run().catch(console.dir);










app.get('/',async(req,res)=>{
    res.send('Freeze manufacturing is running')
})

app.listen(port,()=>{
    console.log('running port',port);
})

