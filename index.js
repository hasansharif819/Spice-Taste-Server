const express = require('express');
const cors = require('cors');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');



const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.elgwk4d.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

//json web token
function verifyJWT(req, res, next){
    const authHeader = req.headers.authorization;
    if(!authHeader){
        return res.status(401).send({message: 'Unauthorized access'});
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN, function(err, decoded){
        if(err){
            return res.status(403).send({message: 'Forbidden access'});
        }
        req.decoded = decoded;
        next();
    })
}

async function run(){
    try{
        await client.connect();
        const spiceCollection = client.db('spice-taste').collection('spices');
        const userCollection = client.db('spice-taste').collection('users');
        const messageCollection = client.db('spice-taste').collection('messages');
        const blogCollection = client.db('spice-taste').collection('blogs');
        const commentCollection = client.db('spice-taste').collection('comments');
        
        //login user data collect
        app.put('/user/:email', async (req, res) => {
            const email = req.params.email;
            const user = req.body;
            const filter = { email: email };
            const options = { upsert: true };
            const updateDoc = {
                $set: user,
            };
            const result = await userCollection.updateOne(filter, updateDoc, options);
            const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN, { expiresIn: '1h' });
            res.send({ result, token });
        });

        //get all users
        app.get('/user', verifyJWT, async (req, res) => {
            const users = await userCollection.find().toArray();
            res.send(users);
        });
        
        //get all spices
        app.get('/spice', async(req, res) => {
            const page = parseInt(req.query.page);
            const size = parseInt(req.query.size);

            const query = {};
            const cursor = spiceCollection.find(query);

            let spices;
            if(page || size){
                spices = await cursor.skip(page*size).limit(size).toArray();
            }
            else{
                spices = await spiceCollection.find().toArray();
            }
            res.send(spices);
        });

        //pagination
        app.get('/spiceCount', async(req, res) => {
            const count = await spiceCollection.estimatedDocumentCount()
            res.send({count});
        });

        //get single spice using id
        app.get('/spice/:id', async(req, res) => {
            const id = req.params.id;
            const query = { '_id': ObjectId(id) };
            const result = await spiceCollection.findOne(query);
            res.send(result);
        });
        //update quantity
        app.put('/spice/:id', async(req, res) => {
            const id = req.params.id;
            const updateQuantity = req.body;
            const filter = { _id: ObjectId(id) };
            const options = { upsert: true };
            const updateDoc = {
                $set:  { quantity: updateQuantity.quantity}
                
            };
            const result = await spiceCollection.updateOne(filter, updateDoc, options);
            res.send(result);
        });

        //post or upload new spice
        app.post('/spice', async(req, res) => {
            const item = req.body;
            const query = {email: item.email, name: item.name, price: item.price, quantity: item.quantity, img: item.image};
            const exists = await spiceCollection.findOne(query);
            if(exists){
                return res.send({success: false, item: exists})
            }
            else{
                const result = await spiceCollection.insertOne(item);
                res.send({success: true, result});
            }
        });

        //delete item by using id
        app.delete('/spice/:id', async(req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await spiceCollection.deleteOne(query);
            res.send(result);
        });

        //my items by useing email query
        app.get('/myitem', async(req, res) => {
            const email = req.query.email;
            const query = {email: email};
            const result = await spiceCollection.find(query).toArray();
            res.send(result);
        });

        //user meaasage
        app.post('/message', async(req, res) => {
            const item = req.body;
            const query = {email: item.email, message: item.message, contact: item.contact, img: item.image};
            const exists = await messageCollection.findOne(query);
            if(exists){
                return res.send({success: false, item: exists})
            }
            else{
                const result = await messageCollection.insertOne(item);
                res.send({success: true, result});
            }
        });

        //blogs
        app.get('/blogs', async(req, res) => {
            const blogs = await blogCollection.find().toArray();
            res.send(blogs)
        });

        //post or upload new blog
        app.post('/blogs', async(req, res) => {
            const blog = req.body;
            const query = {email: blog.email, name: blog.name, des: blog.des, docs: blog.docs, img: blog.image};
            const exists = await blogCollection.findOne(query);
            if(exists){
                return res.send({success: false, blog: exists})
            }
            else{
                const result = await blogCollection.insertOne(blog);
                res.send({success: true, result});
            }
        });

        //comment post
        app.post('/comment', async (req, res) => {
            const comment = req.body;
            // const query = { comment: comment.comment, email: comment.email, name: comment.name, blogId: comment.blogId };
            const result = await commentCollection.insertOne(comment);
            return res.send({ success: true, result });
        });

        //get comment
        app.get('/comment/:blogId', async (req, res) => {
            const blogId = req.params.blogId;
            const query = { blogId: blogId };
            const comment = await commentCollection.find(query).toArray();
            res.send(comment);
        });
        //get user message
        app.get('/message', async(req, res) => {
            const message = await messageCollection.find().toArray();
            res.send(message);
        })
    }
    finally{}
}
run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('Spice-Taste');
})

app.listen(port, () => {
    console.log(`Spice-Taste ${port}`);
})