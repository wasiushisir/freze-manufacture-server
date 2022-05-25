const express = require('express');
const jwt = require('jsonwebtoken');

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require('cors');
require('dotenv').config()
const app=express();
const port=process.env.PORT || 5000
const stripe = require('stripe')(process.env.STRIPE_SECRETE_KEY)

//middleware
app.use(cors())
app.use(express.json())



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.cghyb.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

   const verifyJwt=async(req,res,next)=>{
    const authHeader=req.headers.authorization;
    
    if(!authHeader){
     return res.status(401).send({message:'unauthorized access'})
    }
    const token=authHeader.split(' ')[1]
    // console.log(token);

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRETE, function(err, decoded) {
      if(err){
        return res.status(403).send({message:'forbidden access'})
      }
      req.decoded=decoded;
      next();
      
    });
    


   }

  async function run(){

    try{
        await client.connect();
        const userCollection=client.db('freeze').collection('user');
        const productCollection=client.db('freeze').collection('products');
        const ordertCollection=client.db('freeze').collection('orders');
        const reviewCollection=client.db('freeze').collection('reviews');
        const profileCollection=client.db('freeze').collection('profiles');
        const paymentCollection = client.db('freeze').collection('payments');

        app.post('/create-payment-intent',  async(req, res) =>{
          const service = req.body;
          const price = service.price;
          const amount = price*100;
          const paymentIntent = await stripe.paymentIntents.create({
            amount : amount,
            currency: 'INR',
           
            payment_method_types:['card']
          });
          res.send({clientSecret: paymentIntent.client_secret})
        });









     //create user
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


        //create make admin
        app.put('/user/admin/:email',verifyJwt,async(req,res)=>{
          const email=req.params.email;
          const requester=req.decoded.email;
          const requestAccount=await userCollection.findOne({email:requester})
          if(requestAccount.role=='admin'){

            const filter={email:email}
          

          const updateDoc={
            $set:{role:'admin'}
          }

          const result=await userCollection.updateOne(filter, updateDoc);
         
           return res.send(result)

          }
          else{
            res.status(403).send({message:'forbidden access'})
          }
         
          

        })


        //search admin

        app.get('/admin/:email',async(req,res)=>{
          const email=req.params.email;
          const query={email:email}
          const user=await userCollection.findOne(query)
          const isAdmin=user.role==='admin'
          res.send({admin:isAdmin})
        })









        //get user

        app.get('/user',verifyJwt,async(req,res)=>{
          const query={}
          const user=await userCollection.find(query).toArray();
          res.send(user)
        })



        //get products

        app.get('/products',async(req,res)=>{
          const query={};
          const products=await productCollection.find(query).toArray();
          res.send(products);

        })


        //create products

        app.post('/products',async(req,res)=>{
          const product=req.body;
          const result=await productCollection.insertOne(product);
          res.send({result,success:true})
        })

        //delete product

        app.delete('/products/:id',verifyJwt,async(req,res)=>{
          const id=req.params.id;
          const query={_id:ObjectId(id)}
          const result=await productCollection.deleteOne(query)
          res.send(result)

        })


        //get individual product

        app.get('/products/:id',async(req,res)=>{
          const id=req.params.id;
          const query={_id:ObjectId(id)}
          const product=await productCollection.findOne(query)
          res.send(product)
        })


        //increase product quantity

        app.put('/productQuantity/:id',async(req,res)=>{
          const id=req.params.id;
          const quantity=req.body;
           console.log(quantity);
          const filter={_id:ObjectId(id)}
          const options = { upsert: true };
          const updateDoc={
            $set:quantity
          }
          const result=await productCollection.updateOne(filter, updateDoc, options);
          res.send(result)


        })


        //create order

        app.post('/order',async(req,res)=>{
          const order=req.body;
         
          const result=await ordertCollection.insertOne(order)
          res.send({result,success:true})
        })

        //patch

        app.patch('/order/:id',  async(req, res) =>{
          const id  = req.params.id;
          const payment = req.body;
          const filter = {_id: ObjectId(id)};
          const updatedDoc = {
            $set: {
              paid: true,
              transactionId: payment.transactionId
            }
          }
    
          const result = await paymentCollection.insertOne(payment);
          const updatedBooking = await ordertCollection.updateOne(filter, updatedDoc);
          res.send(updatedBooking);
        })










        //get my order

        app.get('/myorder',verifyJwt,async(req,res)=>{
          const email=req.query.email;
          const decodedEmail=req.decoded.email;
          console.log(email);
          if(email===decodedEmail)
          {
            const filter={email:email}
          const order=await ordertCollection.find(filter).toArray();
         return res.send(order)

          }

         return res.status(403).send({message:'forbidden access'})
          
          
        })



        //delete myorder
        app.delete('/deleteorder/:id',async(req,res)=>{

          const id=req.params.id;
          const query={_id:ObjectId(id)}
          const order=await ordertCollection.deleteOne(query)
          res.send(order);


        })


        //create review

        app.post('/review',async(req,res)=>{
          const review=req.body;
          const result=await reviewCollection.insertOne(review)
          res.send({result,success:true})

        })


        //update profile

        app.put('/myprofile/:userEmail',async(req,res)=>{
          const email=req.params.userEmail;
          const user=req.body;
          console.log(user);
          const filter={email:email}
          const options = { upsert: true };

          const updateDoc = {
            $set:user
          };

          const result = await profileCollection.updateOne(filter, updateDoc, options);

          res.send(result)

        })


        //getting payment id

        app.get('/payment/:id',async(req,res)=>{
          const id=req.params.id;
          const query={_id:ObjectId(id)}
          const order=await ordertCollection.findOne(query)
          res.send(order)
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

