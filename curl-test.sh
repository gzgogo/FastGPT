curl --location --request POST 'http://198.11.180.131:3000/v1/chat/completions' \
--header 'Authorization: Bearer sk-Eqdi4VTWWdkscXPBA85c6b2cC206496d9216C9BfFa56B93c' \
--header 'Content-Type: application/json' \
--data-raw '{
  "model": "gpt-3.5-turbo",
  "stream": true,
  "temperature": 1,
  "max_tokens": 3000,
  "messages": [
    {
      "role": "user",
      "content": "你是谁"
    }
  ]
}'