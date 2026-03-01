set -x
ssh -L 54323:127.0.0.1:54323 -L 54321:127.0.0.1:5433 root@dev.castorworks.cloud
#ssh -v -N -L 54321:127.0.0.1:5433 root@dev.castorworks.cloud
