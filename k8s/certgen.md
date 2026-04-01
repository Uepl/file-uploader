```bash
kubectl create secret tls uploader-certs-secret \
  --cert=/path/to/fullchain.pem \
  --key=/path/to/privkey.pem \
  -n file-uploader
```

```bash
kubectl patch configmap ingress-nginx-controller -n ingress-nginx --type merge -p '{\"data\":{\"allow-snippet-annotations\":\"true\"}}'
```
