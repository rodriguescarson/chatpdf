import { OpenAIApi, Configuration } from 'openai-edge'
const config = new Configuration({
    apiKey:process.env.OPENAI_API_KEY
})

const openai = new OpenAIApi(config)

export async function getEmbedding(text:string) {
    try {
        const response = await openai.createEmbedding({
            model: 'text-embedding-ada-002',
         input: text.replace(/\n/g,' ')   
        }) 
        const result = await response.json()
        if (result.error) {
            throw result.error.message
        }
        return result.data[0].embedding as number[]
    } catch (error) {
        console.log("Error calling openai embedding api")
     throw error   
    }
}

// export async function testOpenAIConnection() {
//     try {
//         const response = await openai.createCompletion({
//             model: 'text-davinci-002',
//             prompt: 'This is a test of the OpenAI connection.',
//             max_tokens: 5, // Adjust as needed
//         });

//         const result = await response.json();
//         console.log("OpenAI API response:", result);

//         if (result.choices && result.choices.length > 0) {
//             console.log("OpenAI is connected and working.");
//         } else {
//             console.log("OpenAI API response did not contain valid data.");
//         }
//     } catch (error) {
//         console.error("Error calling OpenAI API:", error);
//     }
// }

// // Call the test function to check the connection
// testOpenAIConnection();




