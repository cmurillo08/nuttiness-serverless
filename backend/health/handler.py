from aws_lambda_powertools.event_handler import APIGatewayRestResolver

app = APIGatewayRestResolver()


@app.get("/api/v1/health")
def health():
    return {"status": "ok"}


def handler(event, context):
    return app.resolve(event, context)