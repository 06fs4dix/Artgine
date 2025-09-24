#include "Type.h"
#include "CMath.h"
#include "CAsync.h"
#include "STL.h"
#ifndef COctree_H
#define COctree_H


class COctree;
class COctreeData : public IAsync
{
public:
	int m_id;
	CVec3 m_center;
	CVec3 m_size;
	string m_layer;

	vector<COctreeData*> m_result;
	COctree* m_oc;


	COctreeData(const int _id, const CVec3& _center, const CVec3& _size,string _layer="") {
		m_id = _id;
		m_center.CopyImport(_center);
		m_size.CopyImport(_size);
		
		m_layer=_layer;
		m_oc=null;
	}
	virtual void Update(float _delay);
	
};
//int g_test=0;

CVec3 g_minDummy;
CVec3 g_maxDummy;
class COctree 
{
public:
	CVec3 m_center;
	CVec3 m_half;
    CVec3 m_max;
	CBound m_bound;

	vector<COctree*> m_childe;
	vector<COctreeData*> m_data;

	COctree() {}

	COctree(const CVec3& _center, const CVec3& _half) {
		m_center.CopyImport(_center);
		m_half.CopyImport(_half);

	}

	~COctree() 
	{

		for(int i = 0; i < m_childe.size(); i++) 
		{
			if(m_childe[i] == null) continue;
			delete m_childe[i];
		}
		// for(int i = 0; i < m_data.size(); i++) 
		// {
		// 	delete m_data[i];
		// }
	}


	int ContainingPoint(const CVec3& _point) const {
		int oct = 0;
		if(_point.m_F32A[0] >= m_center.m_F32A[0]) oct |= 1;
		if(_point.m_F32A[1] >= m_center.m_F32A[1]) oct |= 2;
		if(_point.m_F32A[2] >= m_center.m_F32A[2]) oct |= 4;
		return oct;
	}

	bool IsLeafNode() const {
		return m_childe.empty();
	}

	COctree* SelectChilde(const CVec3& _point)
	{
		int oct = 0;
		if(_point.m_F32A[0] >= m_center.m_F32A[0]) oct |= 1;
		if(_point.m_F32A[1] >= m_center.m_F32A[1]) oct |= 2;
		if(_point.m_F32A[2] >= m_center.m_F32A[2]) oct |= 4;

		if(m_childe[oct] == null) {
			m_childe[oct] = new COctree();
			m_childe[oct]->m_center.m_F32A[0] = m_center.m_F32A[0] + m_half.m_F32A[0] * (oct & 1 ? 0.5f : -0.5f);
			m_childe[oct]->m_center.m_F32A[1] = m_center.m_F32A[1] + m_half.m_F32A[1] * (oct & 2 ? 0.5f : -0.5f);
			m_childe[oct]->m_center.m_F32A[2] = m_center.m_F32A[2] + m_half.m_F32A[2] * (oct & 4 ? 0.5f : -0.5f);
			m_childe[oct]->m_half.m_F32A[0] = m_half.m_F32A[0] * 0.5f;
			m_childe[oct]->m_half.m_F32A[1] = m_half.m_F32A[1] * 0.5f;
			m_childe[oct]->m_half.m_F32A[2] = m_half.m_F32A[2] * 0.5f;
		}
		return m_childe[oct];
	}
	void ResetBound(const CVec3 &_max)
    {
        this->m_bound.max.m_F32A[0]=this->m_center.m_F32A[0] + this->m_half.m_F32A[0]+_max.m_F32A[0];
        this->m_bound.max.m_F32A[1]=this->m_center.m_F32A[1] + this->m_half.m_F32A[1]+_max.m_F32A[1];
        this->m_bound.max.m_F32A[2]=this->m_center.m_F32A[2] + this->m_half.m_F32A[2]+_max.m_F32A[2];

        this->m_bound.min.m_F32A[0]=this->m_center.m_F32A[0] - this->m_half.m_F32A[0]-_max.m_F32A[0];
        this->m_bound.min.m_F32A[1]=this->m_center.m_F32A[1] - this->m_half.m_F32A[1]-_max.m_F32A[1];
        this->m_bound.min.m_F32A[2]=this->m_center.m_F32A[2] - this->m_half.m_F32A[2]-_max.m_F32A[2];
    }


	void Insert(COctreeData* _ocData,int _depth) 
	{
		if(IsLeafNode()) 
		{
			if(m_data.size() == 0 || m_data[0]->m_center.Equel(_ocData->m_center) || _depth<=0)
			{
				m_data.push_back(_ocData);
				
			}
			else {
				var oldPoint = m_data[0];
				m_childe.resize(8, null);
				for(int i = 0; i < m_data.size(); i++) 
				{
					SelectChilde(oldPoint->m_center)->Insert(m_data[i],_depth-1);
				}
				SelectChilde(_ocData->m_center)->Insert(_ocData,_depth-1);
				m_data.clear();
			}
		}
		else 
		{
			SelectChilde(_ocData->m_center)->Insert(_ocData,_depth-1);
		}
		if(_ocData->m_size.m_F32A[0] > m_max.m_F32A[0]) m_max.m_F32A[0] = _ocData->m_size.m_F32A[0];
		if(_ocData->m_size.m_F32A[1] > m_max.m_F32A[1]) m_max.m_F32A[1] = _ocData->m_size.m_F32A[1];
		if(_ocData->m_size.m_F32A[2] > m_max.m_F32A[2]) m_max.m_F32A[2] = _ocData->m_size.m_F32A[2];

		if(this->m_childe.empty()==false)
        {
            for(int i=0;i<this->m_childe.size();++i)
            {
                if(this->m_childe[i]!=null)
                {
                    this->m_childe[i]->ResetBound(this->m_max);
                }
            }
        }
	}

	int InsideRay(const CVec3& _dir, CVec3& _pos, const CVec3& _org, int* _results, int _index = 0) const {
		if(IsLeafNode()) 
		{
			for(int i=0;i<m_data.size();i++) 
			{
				const CVec3& cen = m_data[i]->m_center;
				const CVec3& siz = m_data[i]->m_size;
				g_maxDummy.m_F32A[0]=cen.m_F32A[0] + siz.m_F32A[0] * 0.5f;
				g_maxDummy.m_F32A[1]=cen.m_F32A[1] + siz.m_F32A[1] * 0.5f;
				g_maxDummy.m_F32A[2]=cen.m_F32A[2] + siz.m_F32A[2] * 0.5f;

				g_minDummy.m_F32A[0]=cen.m_F32A[0] - siz.m_F32A[0] * 0.5f;
				g_minDummy.m_F32A[1]=cen.m_F32A[1] - siz.m_F32A[1] * 0.5f;
				g_minDummy.m_F32A[2]=cen.m_F32A[2] - siz.m_F32A[2] * 0.5f;

				if(CMath::RayBoxIS(g_minDummy,g_maxDummy,_dir,_pos,_org)) 
				{
					_results[_index++] = m_data[i]->m_id;
				}
			}
        } 
		else
		{
            for (int i = 0; i < this->m_childe.size(); ++i) 
			{
                if(m_childe[i]==null) continue;
				const CVec3& cen = m_childe[i]->m_center;
				const CVec3& haf = m_childe[i]->m_half;
                
                g_maxDummy.m_F32A[0]=cen.m_F32A[0]+haf.m_F32A[0]+m_max.m_F32A[0];
                g_maxDummy.m_F32A[1]=cen.m_F32A[1]+haf.m_F32A[1]+m_max.m_F32A[1];
                g_maxDummy.m_F32A[2]=cen.m_F32A[2]+haf.m_F32A[2]+m_max.m_F32A[2];

                g_minDummy.m_F32A[0]=cen.m_F32A[0]-haf.m_F32A[0]-m_max.m_F32A[0];
                g_minDummy.m_F32A[1]=cen.m_F32A[1]-haf.m_F32A[1]-m_max.m_F32A[1];
                g_minDummy.m_F32A[2]=cen.m_F32A[2]-haf.m_F32A[2]-m_max.m_F32A[2];

                if(CMath::RayBoxIS(g_minDummy,g_maxDummy,_dir,_pos,_org)) {
                    _index = m_childe[i]->InsideRay(_dir,_pos,_org,_results,_index);
                }
            }
        }
		return _index;
	}

	int InsidePlane(float* _plane, int* _results, int _index = 0) const {
		if(IsLeafNode()) {
            for(int i=0;i<m_data.size();++i) {
                _results[_index++] = m_data[i]->m_id;
            }
        } else {
            for(int i = 0; i < 8; ++i) {
                if(m_childe[i]==null)  continue;
                
                float r = std::max({m_half.m_F32A[0], m_half.m_F32A[1], m_half.m_F32A[2]});
                float rad = std::sqrt(r*r+r*r+r*r);
                if(CMath::PlaneSphereInside(_plane,m_childe[i]->m_center.m_F32A,rad)) {
                    _index = m_childe[i]->InsidePlane(_plane, _results, _index);
                }
            }
        }
        return _index;
	}

	void InsideBox(const CVec3& _bmin, const CVec3& _bmax, int* _results, int &_index) 
	{
		
		if(IsLeafNode()) 
		{
			for(int i = 0; i < m_data.size(); i++) {
				var data = m_data[i];
				const CVec3& p = data->m_center;
				const CVec3& s = data->m_size;
				if (p.m_F32A[0]-s.m_F32A[0]*0.5f > _bmax.m_F32A[0] || p.m_F32A[1]-s.m_F32A[1]*0.5f > _bmax.m_F32A[1] || p.m_F32A[2]-s.m_F32A[2]*0.5f > _bmax.m_F32A[2]) continue;
				if (p.m_F32A[0]+s.m_F32A[0]*0.5f < _bmin.m_F32A[0] || p.m_F32A[1]+s.m_F32A[1]*0.5f < _bmin.m_F32A[1] || p.m_F32A[2]+s.m_F32A[2]*0.5f < _bmin.m_F32A[2]) continue;
				
				_results[_index] = m_data[i]->m_id;
				_index++;
				//g_test+=1;
			}
		} else {
			for (int i = 0; i < this->m_childe.size(); ++i) 
			{
				
                if(m_childe[i]==null) continue;

				if (this->m_childe[i]->m_bound.max.m_F32A[0] < _bmin.m_F32A[0])  continue;
                if (this->m_childe[i]->m_bound.min.m_F32A[0] > _bmax.m_F32A[0])  continue;
                
                if (this->m_childe[i]->m_bound.min.m_F32A[1] > _bmax.m_F32A[1])  continue;
                if (this->m_childe[i]->m_bound.max.m_F32A[1] < _bmin.m_F32A[1])  continue;
                
                
                if (this->m_childe[i]->m_bound.max.m_F32A[2] < _bmin.m_F32A[2])  continue;
                if (this->m_childe[i]->m_bound.min.m_F32A[2] > _bmax.m_F32A[2])  continue;

                m_childe[i]->InsideBox(_bmin, _bmax, _results, _index);
				//g_test+=1000;
            }
		}

	}
	void InsideBox(const CVec3& _bmin, const CVec3& _bmax, vector<COctreeData*> &_results) 
	{
		
		if(IsLeafNode()) 
		{
			for(int i = 0; i < m_data.size(); i++) {
				var data = m_data[i];
				const CVec3& p = data->m_center;
				const CVec3& s = data->m_size;
				if (p.m_F32A[0]-s.m_F32A[0]*0.5f > _bmax.m_F32A[0] || p.m_F32A[1]-s.m_F32A[1]*0.5f > _bmax.m_F32A[1] || p.m_F32A[2]-s.m_F32A[2]*0.5f > _bmax.m_F32A[2]) continue;
				if (p.m_F32A[0]+s.m_F32A[0]*0.5f < _bmin.m_F32A[0] || p.m_F32A[1]+s.m_F32A[1]*0.5f < _bmin.m_F32A[1] || p.m_F32A[2]+s.m_F32A[2]*0.5f < _bmin.m_F32A[2]) continue;
				
				_results.push_back(m_data[i]);
			
			}
		} else {
			for (int i = 0; i < this->m_childe.size(); ++i) 
			{
				
                if(m_childe[i]==null) continue;

				if (this->m_childe[i]->m_bound.max.m_F32A[0] < _bmin.m_F32A[0])  continue;
                if (this->m_childe[i]->m_bound.min.m_F32A[0] > _bmax.m_F32A[0])  continue;
                
                if (this->m_childe[i]->m_bound.min.m_F32A[1] > _bmax.m_F32A[1])  continue;
                if (this->m_childe[i]->m_bound.max.m_F32A[1] < _bmin.m_F32A[1])  continue;
                
                
                if (this->m_childe[i]->m_bound.max.m_F32A[2] < _bmin.m_F32A[2])  continue;
                if (this->m_childe[i]->m_bound.min.m_F32A[2] > _bmax.m_F32A[2])  continue;

                m_childe[i]->InsideBox(_bmin, _bmax, _results);
            }
		}

	}
};
void COctreeData::Update(float _delay)
{

	this->m_result.clear();

	CVec3 omin(this->m_center.m_F32A[0]-this->m_size.m_F32A[0]*0.5,
			this->m_center.m_F32A[1]-this->m_size.m_F32A[1]*0.5,
			this->m_center.m_F32A[2]-this->m_size.m_F32A[2]*0.5);
	CVec3 omax(this->m_center.m_F32A[0]+this->m_size.m_F32A[0]*0.5,
		this->m_center.m_F32A[1]+this->m_size.m_F32A[1]*0.5,
		this->m_center.m_F32A[2]+this->m_size.m_F32A[2]*0.5);

	this->m_oc->InsideBox(omin,omax,this->m_result);
	//cout<<"COctreeData::Update"<<endl;


}
class COctreeMgr
{
	public:
	vector<COctreeData*> m_ocdPool;
	int m_len=0;
	COctree* m_oc=null;
	void Init(float* _center, float* _half)
	{
		if(m_oc!=null)
			delete m_oc;

		m_oc=new COctree(CVec3(_center), CVec3(_half));
		m_len=0;
	}
	void Build(int _depth)
	{
		for(int i=0;i<m_len;++i)
		{
			m_oc->Insert(m_ocdPool[i],_depth);	
		}
		m_len=0;
	}
	void Insert(int _id, float* _cen, float* _size,char*_layer)
	{
		if(m_len<m_ocdPool.size())
		{
			m_ocdPool[m_len]->m_id=_id;
			m_ocdPool[m_len]->m_center=_cen;
			m_ocdPool[m_len]->m_size=_size;
			m_ocdPool[m_len]->m_layer=_layer;
			m_ocdPool[m_len]->m_oc=this->m_oc;
			
		}
		else
		{
			COctreeData * oc=new COctreeData(_id,_cen,_size,_layer);
			oc->m_oc=this->m_oc;
			m_ocdPool.push_back(oc);
		}
		m_len++;
	}
};
#endif //COctree