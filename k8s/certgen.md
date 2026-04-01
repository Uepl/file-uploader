```bash
kubectl create secret tls uploader-certs-secret \
  --cert=/path/to/fullchain.pem \
  --key=/path/to/privkey.pem \
  -n file-uploader
```

```bash
kubectl patch configmap ingress-nginx-controller -n ingress-nginx --type merge -p '{\"data\":{\"allow-snippet-annotations\":\"true\"}}'
```


# add this to kind cluster

```bash
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: ConfigMap
metadata:
  name: local-registry-hosting
  namespace: kube-public
data:
  localRegistryHosting.v1: |
    host: "localhost:5001"
    help: "https://kind.sigs.k8s.io/docs/user/local-registry/"
EOF
```